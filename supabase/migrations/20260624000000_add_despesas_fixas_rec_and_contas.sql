-- Migration: Add payment accounts and fixed expenses recurrence/competence
-- Created at: 2026-06-24

CREATE TABLE IF NOT EXISTS public.contas_pagamento (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'banco',
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.contas_pagamento (nome, tipo)
SELECT 'Caixa Interno (Espécie)', 'caixa_fisico'
WHERE NOT EXISTS (SELECT 1 FROM public.contas_pagamento WHERE nome = 'Caixa Interno (Espécie)');

INSERT INTO public.contas_pagamento (nome, tipo)
SELECT 'Conta Banco Itaú', 'banco'
WHERE NOT EXISTS (SELECT 1 FROM public.contas_pagamento WHERE nome = 'Conta Banco Itaú');

INSERT INTO public.contas_pagamento (nome, tipo)
SELECT 'Conta Sicredi', 'banco'
WHERE NOT EXISTS (SELECT 1 FROM public.contas_pagamento WHERE nome = 'Conta Sicredi');

INSERT INTO public.contas_pagamento (nome, tipo)
SELECT 'Chave PIX CNPJ', 'carteira_digital'
WHERE NOT EXISTS (SELECT 1 FROM public.contas_pagamento WHERE nome = 'Chave PIX CNPJ');

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='despesas_fixas' AND column_name='competencia') THEN
        ALTER TABLE public.despesas_fixas ADD COLUMN competencia VARCHAR(7);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='despesas_fixas' AND column_name='valor_pago') THEN
        ALTER TABLE public.despesas_fixas ADD COLUMN valor_pago NUMERIC;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='despesas_fixas' AND column_name='recorrencia_grupo_id') THEN
        ALTER TABLE public.despesas_fixas ADD COLUMN recorrencia_grupo_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='despesas_fixas' AND column_name='conta_pagamento_id') THEN
        ALTER TABLE public.despesas_fixas ADD COLUMN conta_pagamento_id INTEGER REFERENCES public.contas_pagamento(id);
    END IF;
END $$;
