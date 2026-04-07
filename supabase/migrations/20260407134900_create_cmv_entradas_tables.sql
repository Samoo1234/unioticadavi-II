-- MIGRAÇÃO: CRIANDO TABELAS DO FLUXO DE CAIXA (CMV ENTRADAS)
-- DATA: 2026-04-07
-- DESCRIÇÃO: Tabela para as categorias, dias e eventos diários.

-- 1. Tabela de Categorias do Plano de Contas
CREATE TABLE IF NOT EXISTS public.cmv_entradas_categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    tipo_sistema TEXT NOT NULL, -- pix, cartao, manual, banco, servicos
    ordem INTEGER NOT NULL DEFAULT 0,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela Celular / Dias com Valores
CREATE TABLE IF NOT EXISTS public.cmv_entradas_diarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_referencia DATE NOT NULL,
    categoria_id UUID REFERENCES public.cmv_entradas_categorias(id) ON DELETE CASCADE,
    valor NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (data_referencia, categoria_id)
);

-- 3. Tabela de Eventos / Textos Diários (Linha 1 Receita Total)
CREATE TABLE IF NOT EXISTS public.cmv_entradas_eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_referencia DATE NOT NULL UNIQUE,
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- TRIGGERS DE UPDATED_AT
CREATE TRIGGER cmv_entradas_diarias_updated_at BEFORE UPDATE ON public.cmv_entradas_diarias FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER cmv_entradas_eventos_updated_at BEFORE UPDATE ON public.cmv_entradas_eventos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- SEED DAS CATEGORIAS PADRÃO 
INSERT INTO public.cmv_entradas_categorias (nome, tipo_sistema, ordem) VALUES
('1.1 Vendas à vista', 'manual', 1),
('1.2 Recebimento de Prestações', 'manual', 2),
('1.3 Serviços', 'servicos', 3),
('1.7 Outros', 'manual', 4),
('1.8 Saque 6682-6', 'banco', 5),
('1.9 Cheque depositado ou sacado', 'manual', 6),
('1.9.1 Cartão/Pix', 'pix', 7),
('2.0 Consultas / clinica', 'servicos', 8)
ON CONFLICT DO NOTHING;
