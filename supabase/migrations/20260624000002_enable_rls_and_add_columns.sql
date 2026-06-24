-- Migration: Enable RLS for contas_pagamento and extrato_contas, and add discount, interest, and fine columns to despesas_fixas
-- Created at: 2026-06-24

-- 1. Enable RLS
ALTER TABLE public.contas_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extrato_contas ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS policies for Authenticated full access (matching project pattern)
DROP POLICY IF EXISTS "Authenticated full access" ON public.contas_pagamento;
CREATE POLICY "Authenticated full access" ON public.contas_pagamento
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access" ON public.extrato_contas;
CREATE POLICY "Authenticated full access" ON public.extrato_contas
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 3. Add columns to despesas_fixas if they do not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='despesas_fixas' AND column_name='desconto') THEN
        ALTER TABLE public.despesas_fixas ADD COLUMN desconto NUMERIC(15,2) DEFAULT 0 NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='despesas_fixas' AND column_name='juros') THEN
        ALTER TABLE public.despesas_fixas ADD COLUMN juros NUMERIC(15,2) DEFAULT 0 NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='despesas_fixas' AND column_name='multa') THEN
        ALTER TABLE public.despesas_fixas ADD COLUMN multa NUMERIC(15,2) DEFAULT 0 NOT NULL;
    END IF;
END $$;
