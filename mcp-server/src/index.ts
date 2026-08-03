import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

const API_BASE_URL = process.env.OTICA_API_BASE_URL || 'http://localhost:3000/api/openclaw/v1';
const API_KEY = process.env.OPENCLAW_API_KEY || 'default_openclaw_secret_key';

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'x-openclaw-api-key': API_KEY,
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Erro HTTP ${response.status}`);
  }
  return data;
}

const server = new Server(
  {
    name: 'openclaw-otica-vision',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available MCP tools for Davi / OpenClaw
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'buscar_proxima_disponibilidade',
        description: 'Pesquisa automaticamente o próximo dia e horário vago disponível para consulta em uma filial.',
        inputSchema: {
          type: 'object',
          properties: {
            a_partir_de: { type: 'string', description: 'Data inicial para buscar no formato YYYY-MM-DD (ex: 2026-08-03)' },
            cidade: { type: 'string', description: 'Filtro opcional de cidade (ex: Mantena)' },
            empresaId: { type: 'number', description: 'ID opcional da filial' },
          },
        },
      },
      {
        name: 'listar_filiais',
        description: 'Lista todas as filiais e lojas ativas da Ótica Vision com fusos horários.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'consultar_horarios_disponiveis',
        description: 'Consulta horários livres e ocupados para uma filial e data específica.',
        inputSchema: {
          type: 'object',
          required: ['empresaId', 'data'],
          properties: {
            empresaId: { type: 'number', description: 'ID da filial' },
            data: { type: 'string', description: 'Data no formato YYYY-MM-DD' },
          },
        },
      },
      {
        name: 'criar_agendamento',
        description: 'Cria um novo agendamento de consulta/exame no sistema após confirmação explícita do paciente.',
        inputSchema: {
          type: 'object',
          required: ['empresaId', 'data', 'horario', 'pacienteNome', 'pacienteTelefone'],
          properties: {
            empresaId: { type: 'number', description: 'ID da filial' },
            data: { type: 'string', description: 'Data no formato YYYY-MM-DD' },
            horario: { type: 'string', description: 'Horário no formato HH:MM (ex: 09:30)' },
            pacienteNome: { type: 'string', description: 'Nome completo do paciente' },
            pacienteTelefone: { type: 'string', description: 'Telefone com DDD do paciente' },
            tipo: { type: 'string', enum: ['Consulta', 'Exame', 'Retorno'], description: 'Tipo do agendamento' },
            idempotencyKey: { type: 'string', description: 'Chave de idempotência opcional para evitar duplicidade' }
          },
        },
      },
      {
        name: 'alterar_status_agendamento',
        description: 'Altera o status de um agendamento existente (ex: confirmado, recusado, cancelado, realizado).',
        inputSchema: {
          type: 'object',
          required: ['agendamentoId', 'status'],
          properties: {
            agendamentoId: { type: 'string', description: 'ID do agendamento' },
            status: { type: 'string', enum: ['aguardando', 'confirmado', 'recusado', 'cancelado', 'realizado'] },
            motivo: { type: 'string', description: 'Justificativa da alteração' },
          },
        },
      },
    ],
  };
});

// Handle tool executions
server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'buscar_proxima_disponibilidade') {
      const query = new URLSearchParams();
      if (args?.a_partir_de) query.append('a_partir_de', String(args.a_partir_de));
      if (args?.cidade) query.append('cidade', String(args.cidade));
      if (args?.empresaId) query.append('empresaId', String(args.empresaId));

      const result = await apiFetch(`/proxima-disponibilidade?${query.toString()}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    if (name === 'listar_filiais') {
      const result = await apiFetch('/filiais');
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    if (name === 'consultar_horarios_disponiveis') {
      const query = new URLSearchParams({
        empresaId: String(args?.empresaId),
        data: String(args?.data),
      });
      const result = await apiFetch(`/horarios-disponiveis?${query.toString()}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    if (name === 'criar_agendamento') {
      const headers: Record<string, string> = {};
      if (args?.idempotencyKey) {
        headers['Idempotency-Key'] = String(args.idempotencyKey);
      }

      const result = await apiFetch('/agendamentos', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          empresaId: args?.empresaId,
          data: args?.data,
          horario: args?.horario,
          pacienteNome: args?.pacienteNome,
          pacienteTelefone: args?.pacienteTelefone,
          tipo: args?.tipo || 'Consulta',
        }),
      });

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    if (name === 'alterar_status_agendamento') {
      const result = await apiFetch(`/agendamentos/${args?.agendamentoId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: args?.status,
          motivo: args?.motivo,
        }),
      });

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    throw new Error(`Ferramenta desconhecida: ${name}`);
  } catch (error: any) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Erro ao executar ferramenta ${name}: ${error.message}` }],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Servidor MCP OpenClaw rodando via Stdio!');
}

main().catch((err) => {
  console.error('Erro fatal no Servidor MCP:', err);
  process.exit(1);
});
