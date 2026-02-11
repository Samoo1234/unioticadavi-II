# Documento de Requisitos de Produto (PRD) - Sistema CMV Ótica

## 1. Visão Geral do Projeto
O **Sistema CMV Ótica** é uma plataforma de gestão financeira e operacional projetada especificamente para o setor óptico. O objetivo principal é fornecer controle total sobre os custos, fornecedores, títulos a pagar e indicadores de margem bruta, permitindo uma gestão eficiente de múltiplas filiais.

## 2. Personas e Papéis
- **Administrador Master**: Acesso total a todas as filiais, gestão de usuários e configurações críticas.
- **Gerente de Filial**: Acesso aos dados operacionais e financeiros de sua unidade específica.
- **Operador Financeiro**: Focado na emissão de títulos, pagamento de contas e gestão de fornecedores.

## 3. Módulos e Funcionalidades

### 3.1 Dashboard
Visualização centralizada de indicadores-chave de desempenho (KPIs).
- **Métricas**: Total de vendas, quantidade de OS abertas, avisos de títulos a vencer.
- **Melhoria Planejada**: Reestruturação para exibir Títulos Pagos vs. Pendentes com breakdowns mensais.

### 3.2 Gestão de Fornecedores
- **Cadastro de Fornecedores**: Registro detalhado com busca e filtros por filial e tipo.
- **Tipos de Fornecedores**: Categorização (Lentes, Armações, Insumos, Diversos) para facilitar a análise de custos.

### 3.3 Gestão Financeira
- **Cadastro de Títulos**: Lançamento de obrigações financeiras vinculadas a fornecedores e filiais.
- **Emissão/Controle de Títulos**: Filtros avançados por período, status (pago/pendente) e geração de relatórios em PDF.
- **Gestão de Despesas**: Separação entre Despesas Fixas e Diversas com categorização específica.

### 3.4 Controle Operacional (Custo de OS)
- **Cálculo de Margem**: Lançamento de custos vinculados a cada Ordem de Serviço (Lentes, Armação, Marketing, Outros).
- **Indicadores de OS**: Cálculo automático de Margem Bruta e Margem Média por OS.
- **Relatórios de OS**: Visão detalhada por filial e período.

### 3.5 Administração e Configurações
- **Gestão de Filiais**: Cadastro e configuração de múltiplas unidades.
- **Gestão de Usuários**: Controle de acesso e permissões.
- **Cadastro de Médicos**: Registro de profissionais para suporte às receitas e OS.

## 4. Stack Tecnológica
- **Frontend**: React.js com Vite para alta performance.
- **Interface**: Material UI (MUI) seguindo uma identidade visual azul e branco.
- **Backend/Database**: Supabase (PostgreSQL) para armazenamento de dados, autenticação e atualizações em tempo real (Realtime).
- **Relatórios**: Geração dinâmica de PDFs para exportação de dados.

## 5. Modelo de Dados (Entidades Principais)
- `usuarios`: Credenciais e níveis de acesso.
- `filiais`: Registro das unidades de negócio.
- `fornecedores`: Dados de fornecedores e tipos vinculados.
- `titulos`: Registro de contas a pagar e status.
- `ordens_servico`: Dados financeiros de cada venda/serviço.
- `despesas`: Controle de custos fixos e variáveis.

## 6. Diferenciais do Sistema
- **Foco em CMV**: Especializado no Custo de Mercadoria Vendida para o setor óptico.
- **Multi-filial**: Gestão centralizada para redes de lojas.
- **Interface Cockpit**: Design focado em funcionalidade, reduzindo distrações para o usuário.

## 7. Roadmap Futuro
1. **Dashboard Mensal Dinâmico**: Visualização de fluxo de caixa projetado mês a mês.
2. **Integração de Gráficos**: Representação visual de custos vs. receitas.
3. **Automação de Conciliação**: Melhorias no fluxo de baixa de títulos.
