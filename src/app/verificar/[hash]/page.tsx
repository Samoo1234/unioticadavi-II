import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

interface VerificarPageProps {
    params: Promise<{ hash: string }>;
}

export async function generateMetadata({ params }: VerificarPageProps): Promise<Metadata> {
    return {
        title: "Verificação de Receita - Blockchain",
        description: "Verifique a autenticidade de uma receita oftalmológica",
    };
}

async function getHashData(hash: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase
        .from("receita_hashes")
        .select("*, pacientes(nome, data_nascimento)")
        .eq("hash_sha256", hash)
        .maybeSingle();

    if (error) {
        console.error("Erro ao buscar hash:", error);
        return null;
    }

    return data;
}

function maskName(name: string): string {
    const parts = name.split(" ");
    return parts
        .map((part, i) => {
            if (i === 0) return part;
            if (part.length <= 2) return part;
            return part[0] + "*".repeat(part.length - 1);
        })
        .join(" ");
}

export default async function VerificarPage({ params }: VerificarPageProps) {
    const { hash } = await params;
    const data = await getHashData(hash);

    const isValid = !!data;
    const dadosHash = data?.dados_hashados as Record<string, string> | null;

    return (
        <div style={{ margin: 0, fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#0a0a0a", color: "#fff", minHeight: "100vh" }}>
            <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px" }}>
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>🔐</div>
                    <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "0.05em" }}>
                        VERIFICAÇÃO BLOCKCHAIN
                    </h1>
                    <p style={{ fontSize: 13, color: "#999", marginTop: 4 }}>
                        Autenticidade de Receita Oftalmológica
                    </p>
                </div>

                {/* Status Card */}
                <div
                    style={{
                        background: isValid ? "linear-gradient(135deg, #052e16, #14532d)" : "linear-gradient(135deg, #450a0a, #7f1d1d)",
                        border: `1px solid ${isValid ? "#22c55e33" : "#ef444433"}`,
                        borderRadius: 12,
                        padding: 24,
                        textAlign: "center",
                        marginBottom: 24,
                    }}
                >
                    <div style={{ fontSize: 48, marginBottom: 12 }}>
                        {isValid ? "✅" : "❌"}
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", color: isValid ? "#4ade80" : "#f87171" }}>
                        {isValid ? "RECEITA AUTÊNTICA" : "RECEITA NÃO ENCONTRADA"}
                    </h2>
                    <p style={{ fontSize: 14, color: isValid ? "#86efac" : "#fca5a5", margin: 0 }}>
                        {isValid
                            ? "Esta receita foi verificada e registrada em nosso sistema"
                            : "Este hash não corresponde a nenhuma receita registrada"
                        }
                    </p>
                </div>

                {isValid && data && (
                    <>
                        {/* Dados da Receita */}
                        <div
                            style={{
                                background: "#111",
                                border: "1px solid #333",
                                borderRadius: 12,
                                padding: 20,
                                marginBottom: 16,
                            }}
                        >
                            <h3 style={{ fontSize: 12, color: "#888", letterSpacing: "0.1em", marginBottom: 16, fontWeight: 600 }}>
                                DADOS DA RECEITA
                            </h3>

                            <InfoRow label="Paciente" value={data.pacientes?.nome ? maskName(data.pacientes.nome) : "—"} />
                            <InfoRow label="Tipo de Lente" value={dadosHash?.tipoLente || "—"} />
                            <InfoRow label="Data de Emissão" value={dadosHash?.dataEmissao ? new Date(dadosHash.dataEmissao + "T12:00:00").toLocaleDateString("pt-BR") : "—"} />
                            <InfoRow label="Status" value={data.status === "confirmed" ? "✅ Confirmada" : data.status === "on-chain" ? "⛓️ Registrada na Blockchain" : "⏳ Pendente"} />
                        </div>

                        {/* Dados Blockchain */}
                        <div
                            style={{
                                background: "#111",
                                border: "1px solid #333",
                                borderRadius: 12,
                                padding: 20,
                                marginBottom: 16,
                            }}
                        >
                            <h3 style={{ fontSize: 12, color: "#888", letterSpacing: "0.1em", marginBottom: 16, fontWeight: 600 }}>
                                REGISTRO BLOCKCHAIN
                            </h3>

                            {data.tx_hash ? (
                                <>
                                    <InfoRow label="TX Hash" value={data.tx_hash} mono />
                                    <InfoRow label="Bloco" value={data.block_number?.toString() || "—"} />
                                    <InfoRow label="Rede" value="Polygon" />
                                </>
                            ) : (
                                <p style={{ fontSize: 13, color: "#666" }}>
                                    Registro on-chain pendente. O hash foi verificado no banco de dados.
                                </p>
                            )}
                        </div>

                        {/* Hash */}
                        <div
                            style={{
                                background: "#111",
                                border: "1px solid #333",
                                borderRadius: 12,
                                padding: 20,
                            }}
                        >
                            <h3 style={{ fontSize: 12, color: "#888", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 600 }}>
                                HASH SHA-256
                            </h3>
                            <p style={{
                                fontFamily: "monospace",
                                fontSize: 10,
                                color: "#4ade80",
                                wordBreak: "break-all",
                                lineHeight: 1.6,
                                margin: 0,
                                background: "#0a0a0a",
                                padding: 12,
                                borderRadius: 8,
                            }}>
                                {hash}
                            </p>
                        </div>
                    </>
                )}

                {/* Footer */}
                <div style={{ textAlign: "center", marginTop: 32, paddingBottom: 20 }}>
                    <p style={{ fontSize: 11, color: "#555" }}>
                        Verificado em {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR")}
                    </p>
                    <p style={{ fontSize: 11, color: "#444", marginTop: 4 }}>
                        Sistema de Verificação Blockchain • Ótica Vision
                    </p>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid #222" }}>
            <span style={{ fontSize: 12, color: "#888", flexShrink: 0 }}>{label}</span>
            <span
                style={{
                    fontSize: 13,
                    color: "#fff",
                    fontFamily: mono ? "monospace" : "inherit",
                    textAlign: "right",
                    marginLeft: 12,
                    wordBreak: mono ? "break-all" : "normal",
                    maxWidth: mono ? "60%" : "auto",
                }}
            >
                {value}
            </span>
        </div>
    );
}
