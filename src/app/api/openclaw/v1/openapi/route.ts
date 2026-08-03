import { NextResponse } from 'next/server'

export async function GET() {
    const openApiSpec = {
        openapi: '3.0.3',
        info: {
            title: 'Ótica Vision OpenClaw API REST V1',
            version: '1.0.0',
            description: 'API REST oficial e segura de integração do OpenClaw (Davi) com a Ótica Vision.'
        },
        servers: [
            {
                url: '/api/openclaw/v1',
                description: 'Servidor Local / Produção V1'
            }
        ],
        components: {
            securitySchemes: {
                ApiKeyAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'x-openclaw-api-key',
                    description: 'Chave de API do OpenClaw'
                },
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'APIKey'
                }
            }
        },
        security: [
            { ApiKeyAuth: [] },
            { BearerAuth: [] }
        ],
        paths: {
            '/proxima-disponibilidade': {
                get: {
                    summary: 'Busca o primeiro horário vago cronológico',
                    parameters: [
                        { name: 'a_partir_de', in: 'query', schema: { type: 'string', example: '2026-08-03' } },
                        { name: 'cidade', in: 'query', schema: { type: 'string' } },
                        { name: 'empresaId', in: 'query', schema: { type: 'integer' } }
                    ],
                    responses: {
                        '200': { description: 'Próxima disponibilidade encontrada' },
                        '401': { description: 'Não autorizado' },
                        '403': { description: 'Escopo insuficiente' },
                        '404': { description: 'Nenhum horário disponível' },
                        '422': { description: 'Parâmetro de data inválido' },
                        '429': { description: 'Limite de requisições excedido' },
                        '500': { description: 'Erro interno' },
                        '503': { description: 'Serviço não configurado' }
                    }
                }
            },
            '/filiais': {
                get: {
                    summary: 'Lista filiais operacionais',
                    responses: {
                        '200': { description: 'Lista de unidades e fusos horários' },
                        '401': { description: 'Não autorizado' },
                        '429': { description: 'Limite de requisições excedido' },
                        '503': { description: 'Serviço não configurado' }
                    }
                }
            },
            '/horarios-disponiveis': {
                get: {
                    summary: 'Consulta horários livres e ocupados',
                    parameters: [
                        { name: 'empresaId', in: 'query', required: true, schema: { type: 'integer' } },
                        { name: 'data', in: 'query', required: true, schema: { type: 'string', example: '2026-08-10' } }
                    ],
                    responses: {
                        '200': { description: 'Slots calculados da filial' },
                        '400': { description: 'Parâmetros ausentes' },
                        '404': { description: 'Filial não encontrada' },
                        '422': { description: 'Configuração de horário inválida' },
                        '429': { description: 'Limite de requisições excedido' },
                        '503': { description: 'Serviço não configurado' }
                    }
                }
            },
            '/agendamentos': {
                get: {
                    summary: 'Lista agendamentos sanitizados do dia',
                    parameters: [
                        { name: 'empresaId', in: 'query', required: true, schema: { type: 'integer' } },
                        { name: 'data', in: 'query', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': { description: 'Agendamentos da filial' },
                        '401': { description: 'Não autorizado' }
                    }
                },
                post: {
                    summary: 'Cria agendamento atômico idempotente',
                    parameters: [
                        { name: 'Idempotency-Key', in: 'header', required: false, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['empresaId', 'data', 'horario', 'pacienteNome', 'pacienteTelefone'],
                                    properties: {
                                        empresaId: { type: 'integer' },
                                        data: { type: 'string' },
                                        horario: { type: 'string' },
                                        pacienteNome: { type: 'string' },
                                        pacienteTelefone: { type: 'string' },
                                        tipo: { type: 'string', enum: ['Consulta', 'Exame', 'Retorno'] }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '201': { description: 'Agendamento criado com sucesso' },
                        '400': { description: 'Corpo inválido ou campos ausentes' },
                        '409': { description: 'Conflito de horário ou Idempotency-Key em uso' },
                        '422': { description: 'Data em formato inválido' },
                        '429': { description: 'Limite de requisições excedido' },
                        '500': { description: 'Erro interno ao salvar' },
                        '503': { description: 'Serviço não configurado' }
                    }
                }
            },
            '/agendamentos/{id}': {
                patch: {
                    summary: 'Transição de status na máquina de estados',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['status'],
                                    properties: {
                                        status: { type: 'string', enum: ['aguardando', 'confirmado', 'recusado', 'cancelado', 'realizado'] },
                                        motivo: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': { description: 'Status atualizado com sucesso' },
                        '404': { description: 'Agendamento não encontrado' },
                        '409': { description: 'Transição de status inválida' },
                        '503': { description: 'Serviço não configurado' }
                    }
                }
            },
            '/webhooks/resposta-whatsapp': {
                get: {
                    summary: 'Verificação Meta Webhook GET',
                    parameters: [
                        { name: 'hub.mode', in: 'query', schema: { type: 'string' } },
                        { name: 'hub.verify_token', in: 'query', schema: { type: 'string' } },
                        { name: 'hub.challenge', in: 'query', schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': { description: 'Desafio retornado com sucesso' },
                        '403': { description: 'Token de verificação incorreto' },
                        '503': { description: 'Verify token não configurado' }
                    }
                },
                post: {
                    summary: 'Recepção de eventos Meta WhatsApp POST',
                    parameters: [
                        { name: 'X-Hub-Signature-256', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': { description: 'Evento processado' },
                        '401': { description: 'Assinatura HMAC inválida' },
                        '503': { description: 'Secret do app não configurado' }
                    }
                }
            },
            '/cron/cleanup': {
                get: {
                    summary: 'Expurgo automatizado de dados expirados',
                    parameters: [
                        { name: 'Authorization', in: 'header', required: true, schema: { type: 'string', example: 'Bearer <CRON_SECRET>' } }
                    ],
                    responses: {
                        '200': { description: 'Limpeza executada com sucesso' },
                        '401': { description: 'Não autorizado' },
                        '503': { description: 'Cron secret não configurado' }
                    }
                }
            }
        }
    }

    return NextResponse.json(openApiSpec)
}
