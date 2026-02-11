"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MainLayout from "@/components/MainLayout";
import PatientInfo from "@/components/clinica/PatientInfo";
import ExamForm from "@/components/clinica/ExamForm";
import HistoryList from "@/components/clinica/HistoryList";
import { supabase } from "@/lib/supabase";
import {
    HistoricoConsulta,
    Exame,
    Prontuario,
    PacienteClinico,
} from "@/data/clinicaData";
import { generatePrescriptionHash, buildHashData } from "@/utils/prescriptionHash";
import { generateQRCodeDataURL } from "@/utils/qrcode";

interface ConfiguracaoHorarios {
    diasDisponiveis: {
        data: string;
        medicoResponsavel: string;
    }[];
}

interface Empresa {
    id: number;
    nomeFantasia: string;
    cidade: string;
    ativo: boolean;
    configuracaoHorarios?: ConfiguracaoHorarios;
}

interface Agendamento {
    id: string;
    paciente_id: string;
    empresa_id: number;
    data: string;
    hora: string;
    tipo: string;
    status: string;
    pacientes: {
        id: string;
        nome: string;
        telefone: string;
        cpf: string;
        data_nascimento: string;
        convenio?: string;
        observacoes?: string;
    };
}

function ClinicaContent() {
    const searchParams = useSearchParams();
    const pacienteIdFromUrl = searchParams.get("pacienteId");

    // Estados
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
    const [carregando, setCarregando] = useState(false);
    const [dataHora, setDataHora] = useState("");

    // Filtros
    const [filtroEmpresaId, setFiltroEmpresaId] = useState<number>(0);
    const [filtroData, setFiltroData] = useState<string>("");

    // Paciente selecionado
    const [pacienteSelecionado, setPacienteSelecionado] = useState<PacienteClinico | null>(null);
    const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<Agendamento | null>(null);

    // Histórico e consulta
    const [historicoConsultas, setHistoricoConsultas] = useState<HistoricoConsulta[]>([]);
    const [consultaSelecionada, setConsultaSelecionada] = useState<HistoricoConsulta | null>(null);
    const [modoNovaConsulta, setModoNovaConsulta] = useState(true);

    // Mensagens
    const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

    // Atualizar data/hora
    useEffect(() => {
        const atualizar = () => {
            const agora = new Date();
            setDataHora(
                agora.toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                })
            );
        };
        atualizar();
        const intervalo = setInterval(atualizar, 1000);
        return () => clearInterval(intervalo);
    }, []);

    // Fetch empresas
    useEffect(() => {
        const fetchEmpresas = async () => {
            const { data, error } = await supabase
                .from('empresas')
                .select('*')
                .eq('ativo', true)
                .order('cidade');

            if (!error && data) {
                const adapted = data.map(e => ({
                    id: e.id,
                    nomeFantasia: e.nome_fantasia,
                    cidade: e.cidade,
                    ativo: e.ativo,
                    configuracaoHorarios: e.configuracao_horarios
                }));
                setEmpresas(adapted);
                if (adapted.length > 0 && filtroEmpresaId === 0) {
                    setFiltroEmpresaId(adapted[0].id);
                }
            }
        };
        fetchEmpresas();
    }, []);

    // Fetch agendamentos quando filtros mudam
    useEffect(() => {
        if (filtroEmpresaId > 0 && filtroData) {
            fetchAgendamentos();
        }
    }, [filtroEmpresaId, filtroData]);

    const fetchAgendamentos = async () => {
        setCarregando(true);
        const { data, error } = await supabase
            .from('agendamentos')
            .select('*, pacientes(*)')
            .eq('empresa_id', filtroEmpresaId)
            .eq('data', filtroData)
            .neq('status', 'cancelado')
            .order('hora');

        if (!error && data) {
            setAgendamentos(data);
        }
        setCarregando(false);
    };

    // Fetch histórico do paciente
    const fetchHistorico = async (pacienteId: string) => {
        try {
            const { data, error } = await supabase
                .from('consultas')
                .select('*')
                .eq('paciente_id', pacienteId)
                .order('data', { ascending: false });

            if (error) {
                console.error("Erro ao buscar histórico:", error);
                setHistoricoConsultas([]);
                return;
            }

            if (data && data.length > 0) {
                const historicoFormatado: HistoricoConsulta[] = data.map((consulta) => ({
                    id: consulta.id,
                    pacienteId: consulta.paciente_id,
                    data: consulta.data,
                    tipo: "Consulta" as const,
                    profissional: "Dr. Responsável",
                    queixaPrincipal: consulta.queixa_principal || "",
                    anamnese: consulta.anamnese || "",
                    observacoesClinicas: consulta.observacoes_clinicas || "",
                    exame: {
                        id: 0,
                        consultaId: 0,
                        data: consulta.data,
                        olhoDireito: {
                            olho: "OD" as const,
                            esferico: consulta.exame_od_esferico || "",
                            cilindrico: consulta.exame_od_cilindrico || "",
                            eixo: consulta.exame_od_eixo || "",
                            adicao: consulta.exame_od_adicao || "",
                            dnp: consulta.exame_od_dnp || "",
                        },
                        olhoEsquerdo: {
                            olho: "OE" as const,
                            esferico: consulta.exame_oe_esferico || "",
                            cilindrico: consulta.exame_oe_cilindrico || "",
                            eixo: consulta.exame_oe_eixo || "",
                            adicao: consulta.exame_oe_adicao || "",
                            dnp: consulta.exame_oe_dnp || "",
                        },
                    },
                    receita: consulta.tipo_lente ? {
                        id: 0,
                        consultaId: 0,
                        data: consulta.data,
                        olhoDireito: {
                            olho: "OD" as const,
                            esferico: consulta.exame_od_esferico || "",
                            cilindrico: consulta.exame_od_cilindrico || "",
                            eixo: consulta.exame_od_eixo || "",
                            adicao: consulta.exame_od_adicao || "",
                            dnp: consulta.exame_od_dnp || "",
                        },
                        olhoEsquerdo: {
                            olho: "OE" as const,
                            esferico: consulta.exame_oe_esferico || "",
                            cilindrico: consulta.exame_oe_cilindrico || "",
                            eixo: consulta.exame_oe_eixo || "",
                            adicao: consulta.exame_oe_adicao || "",
                            dnp: consulta.exame_oe_dnp || "",
                        },
                        tipoLente: consulta.tipo_lente || "",
                        observacoes: consulta.observacoes_receita || "",
                    } : undefined,
                }));
                setHistoricoConsultas(historicoFormatado);
            } else {
                setHistoricoConsultas([]);
            }
        } catch (error) {
            console.error("Erro inesperado ao buscar histórico:", error);
            setHistoricoConsultas([]);
        }
    };

    // Selecionar paciente
    const handleSelecionarPaciente = (agendamento: Agendamento) => {
        setAgendamentoSelecionado(agendamento);
        const paciente: PacienteClinico = {
            id: agendamento.pacientes.id,
            nome: agendamento.pacientes.nome,
            dataNascimento: agendamento.pacientes.data_nascimento || "1990-01-01",
            telefone: agendamento.pacientes.telefone || "",
            documento: agendamento.pacientes.cpf || "",
            convenio: agendamento.pacientes.convenio,
            observacoes: agendamento.pacientes.observacoes || "",
        };
        setPacienteSelecionado(paciente);
        setModoNovaConsulta(true);
        setConsultaSelecionada(null);
        fetchHistorico(paciente.id);
    };

    // Limpar seleção
    const handleLimparSelecao = () => {
        setPacienteSelecionado(null);
        setAgendamentoSelecionado(null);
        setHistoricoConsultas([]);
        setConsultaSelecionada(null);
        setModoNovaConsulta(true);
    };

    // Nova consulta
    const handleNovaConsulta = () => {
        setConsultaSelecionada(null);
        setModoNovaConsulta(true);
    };

    // Selecionar consulta do histórico
    const handleSelectConsulta = (consulta: HistoricoConsulta) => {
        setConsultaSelecionada(consulta);
        setModoNovaConsulta(false);
    };

    // Mostrar mensagem
    const mostrarMensagem = (tipo: "sucesso" | "erro", texto: string) => {
        setMensagem({ tipo, texto });
        setTimeout(() => setMensagem(null), 3000);
    };

    const handleSalvarConsulta = async (dados: {
        prontuario: Prontuario;
        exame: Exame;
        examePerto?: Exame;
        tipoLente: string;
        observacoesReceita: string;
    }): Promise<boolean> => {
        if (!pacienteSelecionado || !agendamentoSelecionado) {
            mostrarMensagem("erro", "Nenhum paciente selecionado");
            return false;
        }

        if (carregando) return false;

        try {
            setCarregando(true);

            // 0. Verificar se já existe consulta para este agendamento (Segurança extra)
            const { data: existente } = await supabase
                .from('consultas')
                .select('id')
                .eq('agendamento_id', agendamentoSelecionado.id)
                .maybeSingle();

            if (existente) {
                mostrarMensagem("erro", "Esta consulta já foi salva anteriormente.");
                setCarregando(false);
                return true; // Retorna true para considerar como "processado"
            }

            // 1. Inserir consulta
            const { data: consultaData, error: consultaError } = await supabase
                .from('consultas')
                .insert({
                    paciente_id: pacienteSelecionado.id,
                    agendamento_id: agendamentoSelecionado.id,
                    empresa_id: agendamentoSelecionado.empresa_id,
                    data: new Date().toISOString().split("T")[0],
                    queixa_principal: dados.prontuario.queixaPrincipal,
                    anamnese: dados.prontuario.anamnese,
                    observacoes_clinicas: dados.prontuario.observacoesClinicas,
                    exame_od_esferico: dados.exame.olhoDireito.esferico,
                    exame_od_cilindrico: dados.exame.olhoDireito.cilindrico,
                    exame_od_eixo: dados.exame.olhoDireito.eixo,
                    exame_od_adicao: dados.exame.olhoDireito.adicao,
                    exame_od_dnp: dados.exame.olhoDireito.dnp,
                    exame_oe_esferico: dados.exame.olhoEsquerdo.esferico,
                    exame_oe_cilindrico: dados.exame.olhoEsquerdo.cilindrico,
                    exame_oe_eixo: dados.exame.olhoEsquerdo.eixo,
                    exame_oe_adicao: dados.exame.olhoEsquerdo.adicao,
                    exame_oe_dnp: dados.exame.olhoEsquerdo.dnp,
                    tipo_lente: dados.tipoLente,
                    observacoes_receita: dados.observacoesReceita,
                    exame_perto_od_esferico: dados.examePerto?.olhoDireito.esferico || null,
                    exame_perto_od_cilindrico: dados.examePerto?.olhoDireito.cilindrico || null,
                    exame_perto_od_eixo: dados.examePerto?.olhoDireito.eixo || null,
                    exame_perto_od_adicao: dados.examePerto?.olhoDireito.adicao || null,
                    exame_perto_od_dnp: dados.examePerto?.olhoDireito.dnp || null,
                    exame_perto_oe_esferico: dados.examePerto?.olhoEsquerdo.esferico || null,
                    exame_perto_oe_cilindrico: dados.examePerto?.olhoEsquerdo.cilindrico || null,
                    exame_perto_oe_eixo: dados.examePerto?.olhoEsquerdo.eixo || null,
                    exame_perto_oe_adicao: dados.examePerto?.olhoEsquerdo.adicao || null,
                    exame_perto_oe_dnp: dados.examePerto?.olhoEsquerdo.dnp || null,
                })
                .select()
                .single();

            if (consultaError) {
                console.error("Erro ao salvar consulta:", consultaError);
                mostrarMensagem("erro", "Erro ao salvar consulta: " + consultaError.message);
                return false;
            }

            // Atualizar status do agendamento para 'atendido'
            await supabase
                .from('agendamentos')
                .update({ status: 'atendido' })
                .eq('id', agendamentoSelecionado.id);

            mostrarMensagem("sucesso", "Consulta salva com sucesso!");

            // Recarregar agendamentos
            fetchAgendamentos();

            // Recarregar histórico do paciente para mostrar a nova consulta
            if (pacienteSelecionado) {
                fetchHistorico(pacienteSelecionado.id);
            }

            return true;
        } catch (error) {
            console.error("Erro inesperado:", error);
            mostrarMensagem("erro", "Erro inesperado ao salvar consulta");
            return false;
        } finally {
            setCarregando(false);
        }
    };

    // Gerar receita (abre impressão)
    const handleGerarReceita = async (dados: {
        exame: Exame;
        examePerto?: Exame;
        tipoLente: string;
        observacoesReceita: string;
    }) => {
        if (!pacienteSelecionado) {
            mostrarMensagem("erro", "Nenhum paciente selecionado");
            return;
        }

        // 1. Gerar hash SHA-256 da receita
        let hashHex = "";
        let qrDataUrl = "";
        try {
            const hashData = buildHashData({
                paciente: {
                    nome: pacienteSelecionado.nome,
                    cpf: pacienteSelecionado.documento,
                    dataNascimento: pacienteSelecionado.dataNascimento,
                },
                exame: dados.exame,
                examePerto: dados.examePerto,
                tipoLente: dados.tipoLente,
            });

            hashHex = await generatePrescriptionHash(hashData);
            qrDataUrl = await generateQRCodeDataURL(hashHex);

            // 2. Salvar hash no Supabase
            const agendamentoId = agendamentoSelecionado?.id;
            if (agendamentoId) {
                const { error: hashError } = await supabase
                    .from('receita_hashes')
                    .insert({
                        agendamento_id: agendamentoId,
                        paciente_id: pacienteSelecionado.id,
                        hash_sha256: hashHex,
                        dados_hashados: hashData,
                        status: 'confirmed',
                    });

                if (hashError) {
                    console.error("Erro ao salvar hash:", hashError);
                }
            }
        } catch (err) {
            console.error("Erro ao gerar hash/QR:", err);
        }

        // 3. Criar HTML da receita com QR Code
        const receitaHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Receita - ${pacienteSelecionado.nome}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 20px 30px; max-width: 800px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 15px; }
        .header h1 { font-size: 22px; margin-bottom: 3px; }
        .header p { font-size: 13px; color: #666; }
        .patient-info { margin-bottom: 15px; padding: 10px 15px; background: #f5f5f5; border-radius: 5px; }
        .patient-info p { margin: 3px 0; font-size: 13px; }
        .prescription-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .prescription-table th, .prescription-table td { border: 1px solid #333; padding: 6px 8px; text-align: center; font-size: 13px; }
        .prescription-table th { background: #333; color: white; font-size: 12px; }
        .eye-label { font-weight: bold; background: #eee; }
        .lens-info { margin-bottom: 10px; }
        .lens-info p { margin: 5px 0; font-size: 13px; }
        .observations { padding: 10px; background: #ffffd0; border: 1px solid #e0e000; margin-bottom: 15px; font-size: 13px; }
        .footer { margin-top: 20px; text-align: center; }
        .signature { margin-top: 40px; border-top: 1px solid #333; width: 300px; margin-left: auto; margin-right: auto; padding-top: 8px; font-size: 13px; }
        .blockchain-verification {
            margin-top: 20px;
            padding: 12px;
            border: 2px solid #2d5a27;
            border-radius: 8px;
            background: #f0f9f0;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .blockchain-verification .qr-side { flex-shrink: 0; }
        .blockchain-verification .info-side { text-align: left; }
        .blockchain-verification h3 {
            color: #2d5a27;
            font-size: 12px;
            margin-bottom: 4px;
        }
        .blockchain-verification .hash {
            font-family: monospace;
            font-size: 8px;
            color: #555;
            word-break: break-all;
            margin-top: 4px;
        }
        .blockchain-verification .instructions {
            font-size: 10px;
            color: #666;
            margin-top: 4px;
        }
        .blockchain-verification img {
            display: block;
        }
        @media print { body { padding: 15px 20px; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>RECEITA OFTALMOLÓGICA</h1>
        <p>Data: ${new Date().toLocaleDateString("pt-BR")}</p>
    </div>
    
    <div class="patient-info">
        <p><strong>Paciente:</strong> ${pacienteSelecionado.nome}</p>
        <p><strong>Data de Nascimento:</strong> ${pacienteSelecionado.dataNascimento ? new Date(pacienteSelecionado.dataNascimento + "T12:00:00").toLocaleDateString("pt-BR") : "-"}</p>
    </div>
    
    ${dados.examePerto ? '<h3 style="margin-bottom: 10px; font-size: 16px; color: #333;">LONGE (Distância)</h3>' : ''}
    <table class="prescription-table">
        <thead>
            <tr>
                <th>OLHO</th>
                <th>ESFÉRICO</th>
                <th>CILÍNDRICO</th>
                <th>EIXO</th>
                <th>ADIÇÃO</th>
                <th>DNP</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="eye-label">OD (Direito)</td>
                <td>${dados.exame.olhoDireito.esferico || "-"}</td>
                <td>${dados.exame.olhoDireito.cilindrico || "-"}</td>
                <td>${dados.exame.olhoDireito.eixo || "-"}°</td>
                <td>${dados.exame.olhoDireito.adicao || "-"}</td>
                <td>${dados.exame.olhoDireito.dnp || "-"} mm</td>
            </tr>
            <tr>
                <td class="eye-label">OE (Esquerdo)</td>
                <td>${dados.exame.olhoEsquerdo.esferico || "-"}</td>
                <td>${dados.exame.olhoEsquerdo.cilindrico || "-"}</td>
                <td>${dados.exame.olhoEsquerdo.eixo || "-"}°</td>
                <td>${dados.exame.olhoEsquerdo.adicao || "-"}</td>
                <td>${dados.exame.olhoEsquerdo.dnp || "-"} mm</td>
            </tr>
        </tbody>
    </table>
    
    ${dados.examePerto ? `
    <h3 style="margin: 20px 0 10px; font-size: 16px; color: #333;">PERTO (Leitura)</h3>
    <table class="prescription-table">
        <thead>
            <tr>
                <th>OLHO</th>
                <th>ESFÉRICO</th>
                <th>CILÍNDRICO</th>
                <th>EIXO</th>
                <th>ADIÇÃO</th>
                <th>DNP</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="eye-label">OD (Direito)</td>
                <td>${dados.examePerto.olhoDireito.esferico || "-"}</td>
                <td>${dados.examePerto.olhoDireito.cilindrico || "-"}</td>
                <td>${dados.examePerto.olhoDireito.eixo || "-"}°</td>
                <td>${dados.examePerto.olhoDireito.adicao || "-"}</td>
                <td>${dados.examePerto.olhoDireito.dnp || "-"} mm</td>
            </tr>
            <tr>
                <td class="eye-label">OE (Esquerdo)</td>
                <td>${dados.examePerto.olhoEsquerdo.esferico || "-"}</td>
                <td>${dados.examePerto.olhoEsquerdo.cilindrico || "-"}</td>
                <td>${dados.examePerto.olhoEsquerdo.eixo || "-"}°</td>
                <td>${dados.examePerto.olhoEsquerdo.adicao || "-"}</td>
                <td>${dados.examePerto.olhoEsquerdo.dnp || "-"} mm</td>
            </tr>
        </tbody>
    </table>
    ` : ''}
    
    <div class="lens-info">
        <p><strong>Tipo de Lente:</strong> ${dados.tipoLente}</p>
    </div>
    
    ${dados.observacoesReceita ? `
    <div class="observations">
        <p><strong>Observações:</strong></p>
        <p>${dados.observacoesReceita}</p>
    </div>
    ` : ""}
    
    <div class="footer">
        <div class="signature">
            <p>Assinatura do Profissional</p>
        </div>
    </div>

    ${hashHex ? `
    <div class="blockchain-verification">
        ${qrDataUrl ? `<div class="qr-side"><img src="${qrDataUrl}" alt="QR Code" width="100" height="100" /></div>` : ''}
        <div class="info-side">
            <h3>🔐 VERIFICAÇÃO BLOCKCHAIN</h3>
            <p class="instructions">Escaneie o QR Code para verificar a autenticidade desta receita</p>
            <p class="hash">Hash: ${hashHex}</p>
        </div>
    </div>
    ` : ''}
    
    <script>
        window.onload = function() { 
            window.print(); 
        }
    </script>
</body>
</html>`;

        // Criar blob e abrir em nova aba
        const blob = new Blob([receitaHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        // Abrir em nova aba
        const newWindow = window.open(url, '_blank');

        if (!newWindow) {
            const link = document.createElement('a');
            link.href = url;
            link.download = `receita_${pacienteSelecionado.nome.replace(/\s/g, '_')}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            mostrarMensagem("sucesso", "Receita baixada! Abra o arquivo para imprimir.");
        } else {
            mostrarMensagem("sucesso", "Receita gerada com verificação blockchain!");
        }

        // Limpar URL após um tempo
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    };

    // Preparar dados para o ExamForm
    const getExameAtual = (): Exame | undefined => {
        if (consultaSelecionada) {
            return consultaSelecionada.exame;
        }
        return undefined;
    };

    const getProntuarioAtual = (): Prontuario | undefined => {
        if (consultaSelecionada) {
            return {
                id: consultaSelecionada.id,
                pacienteId: consultaSelecionada.pacienteId,
                queixaPrincipal: consultaSelecionada.queixaPrincipal,
                anamnese: consultaSelecionada.anamnese,
                observacoesClinicas: consultaSelecionada.observacoesClinicas,
            };
        }
        return undefined;
    };

    // Unidades para o filtro
    const unidades = useMemo(() => {
        return empresas.map((e) => ({
            id: e.id,
            label: `${e.nomeFantasia} - ${e.cidade}`,
        }));
    }, [empresas]);

    // Empresa selecionada
    const empresaSelecionada = useMemo(() => {
        return empresas.find((e) => e.id === filtroEmpresaId);
    }, [empresas, filtroEmpresaId]);

    // Gerar datas disponíveis baseadas na configuração da empresa
    const datasDisponiveis = useMemo(() => {
        const config = empresaSelecionada?.configuracaoHorarios;
        if (!config || !config.diasDisponiveis || config.diasDisponiveis.length === 0) {
            return [];
        }

        const hoje = new Date().toISOString().split("T")[0];

        return config.diasDisponiveis
            .filter((d) => d.data >= hoje)
            .sort((a, b) => a.data.localeCompare(b.data))
            .map((d) => ({
                value: d.data,
                label: new Date(d.data + "T12:00:00").toLocaleDateString("pt-BR", {
                    weekday: "short",
                    day: "2-digit",
                    month: "2-digit",
                }).toUpperCase(),
                medico: d.medicoResponsavel,
            }));
    }, [empresaSelecionada]);

    // Selecionar primeira data disponível quando empresa muda
    useEffect(() => {
        if (datasDisponiveis.length > 0 && !filtroData) {
            setFiltroData(datasDisponiveis[0].value);
        } else if (datasDisponiveis.length > 0 && !datasDisponiveis.find(d => d.value === filtroData)) {
            setFiltroData(datasDisponiveis[0].value);
        }
    }, [datasDisponiveis]);

    return (
        <MainLayout>
            <div className="h-full flex flex-col">
                {/* Header da Clínica */}
                <div className="border-b border-gray-800 pb-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div>
                                <div className="text-xs text-gray-500">CLÍNICA</div>
                                <div className="text-lg font-bold text-white">
                                    {pacienteSelecionado ? pacienteSelecionado.nome : "Selecione um paciente"}
                                </div>
                            </div>
                            <div className="h-8 w-px bg-gray-700"></div>
                            <div>
                                <div className="text-xs text-gray-500">MODO</div>
                                <div className={`text-sm font-medium ${modoNovaConsulta ? "text-green-500" : "text-yellow-500"}`}>
                                    {pacienteSelecionado ? (modoNovaConsulta ? "NOVA CONSULTA" : "VISUALIZANDO HISTÓRICO") : "AGUARDANDO SELEÇÃO"}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <div className="text-xs text-gray-500">DATA/HORA</div>
                                <div className="text-sm font-mono text-white">{dataHora}</div>
                            </div>
                            {pacienteSelecionado && (
                                <>
                                    <div className="h-8 w-px bg-gray-700"></div>
                                    <button
                                        onClick={handleLimparSelecao}
                                        className="px-4 py-2 bg-gray-800 border border-gray-700 text-sm font-medium text-white hover:bg-gray-700"
                                    >
                                        ← VOLTAR
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mensagem */}
                {mensagem && (
                    <div className={`mb-4 px-4 py-2 text-sm font-medium ${mensagem.tipo === "sucesso"
                        ? "bg-green-900/50 border border-green-700 text-green-400"
                        : "bg-red-900/50 border border-red-700 text-red-400"
                        }`}>
                        {mensagem.texto}
                    </div>
                )}

                {/* Layout Principal */}
                <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
                    {/* Coluna 1 - Filtros + Lista de Pacientes ou Info do Paciente */}
                    <div className="col-span-3 flex flex-col gap-4 overflow-hidden">
                        {!pacienteSelecionado ? (
                            <>
                                {/* Filtros */}
                                <div className="bg-gray-900 border border-gray-800 p-4">
                                    <div className="text-xs font-bold text-gray-400 mb-3 pb-2 border-b border-gray-700">
                                        FILTROS
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">CIDADE/UNIDADE</label>
                                            <select
                                                value={filtroEmpresaId}
                                                onChange={(e) => setFiltroEmpresaId(Number(e.target.value))}
                                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                                            >
                                                <option value={0}>Selecione...</option>
                                                {unidades.map((u) => (
                                                    <option key={u.id} value={u.id}>{u.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">DATA</label>
                                            <select
                                                value={filtroData}
                                                onChange={(e) => setFiltroData(e.target.value)}
                                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                                                disabled={datasDisponiveis.length === 0}
                                            >
                                                {datasDisponiveis.length === 0 ? (
                                                    <option value="">Nenhuma data disponível</option>
                                                ) : (
                                                    datasDisponiveis.map((d) => (
                                                        <option key={d.value} value={d.value}>
                                                            {d.label} {d.medico ? `(${d.medico})` : ""}
                                                        </option>
                                                    ))
                                                )}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Lista de Pacientes Agendados */}
                                <div className="bg-gray-900 border border-gray-800 flex-1 overflow-hidden flex flex-col">
                                    <div className="px-4 py-3 border-b border-gray-800">
                                        <div className="text-xs font-bold text-gray-400">PACIENTES AGENDADOS</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {empresaSelecionada?.cidade} - {new Date(filtroData + "T12:00:00").toLocaleDateString("pt-BR")}
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto divide-y divide-gray-800/50">
                                        {carregando ? (
                                            <div className="p-4 text-center text-gray-500 text-sm">
                                                Carregando...
                                            </div>
                                        ) : agendamentos.length === 0 ? (
                                            <div className="p-4 text-center text-gray-500 text-sm">
                                                Nenhum agendamento para esta data
                                            </div>
                                        ) : (
                                            agendamentos.map((ag) => (
                                                <button
                                                    key={ag.id}
                                                    onClick={() => handleSelecionarPaciente(ag)}
                                                    className="w-full text-left px-4 py-3 hover:bg-gray-800/50 transition-colors"
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-mono text-white">{ag.hora.substring(0, 5)}</span>
                                                        <span className={`text-xs font-medium ${ag.status === "confirmado" ? "text-green-500" : ag.status === "aguardando" ? "text-yellow-500" : "text-gray-400"}`}>
                                                            {ag.status.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-gray-300">{ag.pacientes?.nome || "Desconhecido"}</div>
                                                    <div className="text-xs text-gray-500">{ag.tipo}</div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <PatientInfo
                                paciente={pacienteSelecionado}
                                onNovaConsulta={handleNovaConsulta}
                            />
                        )}
                    </div>

                    {/* Coluna 2 - ExamForm (Centro) */}
                    <div className="col-span-6">
                        {pacienteSelecionado ? (
                            <ExamForm
                                key={consultaSelecionada?.id || "nova"}
                                exameInicial={getExameAtual()}
                                prontuarioInicial={getProntuarioAtual()}
                                modoVisualizacao={!modoNovaConsulta}
                                pacienteId={pacienteSelecionado?.id}
                                agendamentoId={agendamentoSelecionado?.id}
                                onSalvarConsulta={handleSalvarConsulta}
                                onGerarReceita={handleGerarReceita}
                            />
                        ) : (
                            <div className="h-full bg-gray-900 border border-gray-800 flex items-center justify-center">
                                <div className="text-center text-gray-500">
                                    <div className="text-4xl mb-4">👁️</div>
                                    <div className="text-sm">Selecione um paciente na lista</div>
                                    <div className="text-xs mt-2">para iniciar o atendimento</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Coluna 3 - Histórico (Direita) */}
                    <div className="col-span-3">
                        {pacienteSelecionado ? (
                            <HistoryList
                                historico={historicoConsultas}
                                consultaSelecionada={consultaSelecionada}
                                onSelectConsulta={handleSelectConsulta}
                            />
                        ) : (
                            <div className="h-full bg-gray-900 border border-gray-800 flex items-center justify-center">
                                <div className="text-center text-gray-500">
                                    <div className="text-2xl mb-2">📋</div>
                                    <div className="text-xs">Histórico do paciente</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

export default function ClinicaPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <ClinicaContent />
        </Suspense>
    );
}
