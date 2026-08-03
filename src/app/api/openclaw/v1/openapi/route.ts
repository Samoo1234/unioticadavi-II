import { NextResponse } from 'next/server'

export async function GET() {
    const openApiSpec = {
        openapi: '3.0.3',
        info: {
            title: 'Ótica Vision OpenClaw API',
            version: '1.0.0',
            description: 'API REST oficial de integração do OpenClaw (Davi) para consulta de horários, filiais, busca de próxima disponibilidade e agendamento de consultas.'
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
                    summary: 'Busca a próxima data e horário livre',
                    description: 'Varre as filiais ativas a partir da data informada e retorna o primeiro slot de atendimento disponível.',
                    parameters: [
                        { name: 'a_partir_de', in: 'query', schema: { type: 'string', example: '2026-08-03' } },
                        { name: 'cidade', in: 'query', schema: { type: 'string', example: 'Mantena' } },
                        { name: 'empresaId', in: 'query', schema: { type: 'integer', example: 1 } }
                    ],
                    responses: {
                        '200': { description: 'Próxima disponibilidade encontrada' },
                        '404': { description: 'Nenhum horário disponível encontrado' }
                    }
                }
            },
            '/filiais': {
                get: {
                    summary: 'Lista filiais ativas',
                    responses: {
                        '200': { description: 'Lista de unidades e fusos horários' }
                    }
                }
            },
            '/horarios-disponiveis': {
                get: {
                    summary: 'Consulta horários livres e ocupados em um dia específico',
                    parameters: [
                        { name: 'empresaId', in: 'query', required: true, schema: { type: 'integer' } },
                        { name: 'data', in: 'query', required: true, schema: { type: 'string', example: '2026-08-10' } }
                    ],
                    responses: {
                        '200': { description: 'Slots de horários da filial no dia' }
                    }
                }
            },
            '/agendamentos': {
                get: {
                    summary: 'Lista agendamentos do dia',
                    parameters: [
                        { name: 'empresaId', in: 'query', required: true, schema: { type: 'integer' } },
                        { name: 'data', in: 'query', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': { description: 'Lista de agendamentos sanitizados (LGPD)' }
                    }
                },
                post: {
                    summary: 'Cria um novo agendamento',
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
                        '409': { description: 'Conflito de horário detectado' }
                    }
                }
            },
            '/agendamentos/{id}': {
                patch: {
                    summary: 'Altera o status do agendamento',
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
                        '200': { description: 'Status atualizado com sucesso' }
                    }
                }
            }
        }
    }

    return NextResponse.json(openApiSpec)
}
