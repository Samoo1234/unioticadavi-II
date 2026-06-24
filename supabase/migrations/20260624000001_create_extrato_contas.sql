-- Migration: Create extrato_contas table and trigger to sync payments
-- Created at: 2026-06-24

-- 1. Add saldo_inicial to contas_pagamento if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contas_pagamento' AND column_name='saldo_inicial') THEN
        ALTER TABLE public.contas_pagamento ADD COLUMN saldo_inicial NUMERIC(15,2) DEFAULT 0 NOT NULL;
    END IF;
END $$;

-- 2. Create extrato_contas table
CREATE TABLE IF NOT EXISTS public.extrato_contas (
    id SERIAL PRIMARY KEY,
    conta_id INTEGER NOT NULL REFERENCES public.contas_pagamento(id) ON DELETE CASCADE,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    valor NUMERIC(15,2) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    data_transacao DATE DEFAULT CURRENT_DATE NOT NULL,
    referencia_tipo VARCHAR(50),
    referencia_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (referencia_tipo, referencia_id)
);

-- 3. Create or replace the sync trigger function
CREATE OR REPLACE FUNCTION public.sincronizar_despesa_fixa_extrato()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.extrato_contas
        WHERE referencia_tipo = 'despesa_fixa' AND referencia_id = OLD.id;
        RETURN OLD;
    ELSE
        IF NEW.status = 'pago' AND NEW.conta_pagamento_id IS NOT NULL AND NEW.valor_pago IS NOT NULL THEN
            INSERT INTO public.extrato_contas (conta_id, tipo, valor, descricao, data_transacao, referencia_tipo, referencia_id)
            VALUES (
                NEW.conta_pagamento_id,
                'saida',
                NEW.valor_pago,
                'Pagamento: ' || COALESCE(NEW.credor, 'Despesa Fixa'),
                COALESCE(NEW.data_pagamento, CURRENT_DATE),
                'despesa_fixa',
                NEW.id
            )
            ON CONFLICT (referencia_tipo, referencia_id) DO UPDATE
            SET conta_id = EXCLUDED.conta_id,
                valor = EXCLUDED.valor,
                descricao = EXCLUDED.descricao,
                data_transacao = EXCLUDED.data_transacao;
        ELSE
            DELETE FROM public.extrato_contas
            WHERE referencia_tipo = 'despesa_fixa' AND referencia_id = NEW.id;
        END IF;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Assign trigger to despesas_fixas
DROP TRIGGER IF EXISTS trg_sincronizar_despesa_fixa_extrato ON public.despesas_fixas;
CREATE TRIGGER trg_sincronizar_despesa_fixa_extrato
AFTER INSERT OR UPDATE OR DELETE ON public.despesas_fixas
FOR EACH ROW
EXECUTE FUNCTION public.sincronizar_despesa_fixa_extrato();
