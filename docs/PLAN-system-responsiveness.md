# PLAN: System Responsiveness (Mobile Optimization)

Este plano detalha a estratégia para tornar o sistema **ÓTICA DAVI** totalmente responsivo, com foco em consultas rápidas e agendamentos via celular, utilizando uma navegação moderna estilo Hamburger.

## User Review Required

> [!IMPORTANT]
> **Estratégia Mobile-First**: O layout será adaptado para que telas complexas (como Vendas) priorizem a visualização de dados e histórico no celular, mantendo a edição pesada mais confortável no Desktop/Tablet.

## Proposed Phases

### Fase 1: Base de Layout & Navegação
**Objetivo**: Criar a estrutura que permite ao sistema se adaptar automaticamente ao tamanho da tela.

- **[MODIFY] MainLayout.tsx**: Alterar de `flex-row` fixo para um sistema que empilha componentes verticalmente em telas < 1024px.
- **[MODIFY] Sidebar.tsx**: Implementar o **Menu Hamburger**.
  - No desktop: Sidebar lateral fixa (como é hoje).
  - No mobile: Ícone hambúrguer no header que abre um painel lateral overlay (deslizante).
- **[MODIFY] Header.tsx**: Simplificar as informações de perfil no celular para evitar poluição visual.

### Fase 2: Dashboard & Componentes Globais
**Objetivo**: Garantir que as informações gerenciais sejam legíveis no celular.

- **Cards de Resumo**: Mudar de 4 colunas para 1 ou 2 colunas dependendo da largura da tela.
- **Tabelas de Dados**: Implementar "Mobile Cards" para tabelas, onde cada linha vira um card individual em telas pequenas.

### Fase 3: Agendamento (Foco Mobile)
**Objetivo**: Permitir que o usuário veja e crie agendamentos de qualquer lugar.

- **Agenda**: Adaptar a visualização da grade de horários para uma lista diária vertical em celulares.
- **Formulários**: Garantir que todos os campos de entrada sejam grandes o suficiente para toque (`touch-friendly`).

### Fase 4: Vendas (Visualização & Histórico)
**Objetivo**: Otimizar a consulta de vendas realizadas no celular.

- **PDV**: Adaptar o formulário de venda para um passo-a-passo (`stepper`) ou seções colapsáveis no mobile.
- **Histórico**: Priorizar a visualização do status do pagamento e TSO.

## Verification Plan

### Automated Tests
- Validar se o build passa com as alterações de layout.

### Manual Verification
- Testar o sistema usando o **Chrome DevTools** emulando iPhone 14 e Pixel 7.
- Verificar se o menu hambúrguer abre e fecha corretamente.
- Confirmar se não há "scroll" horizontal indesejado nas páginas principais.

---
**Próximos Passos**:
1. Aprovação deste plano.
2. Execução da Fase 1 (Layout & Hamburger).
