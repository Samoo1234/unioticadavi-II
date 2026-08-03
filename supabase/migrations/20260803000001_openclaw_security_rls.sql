-- Migration: OpenClaw Security Hardening, RLS, LGPD & Atomic RPC
-- Data: 2026-08-03

-- 1. Add timezone column to empresas if not exists
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Sao_Paulo';

-- 2. Create inbound webhook events table
CREATE TABLE IF NOT EXISTS public.openclaw_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    sender_phone TEXT,
    sanitized_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create persistent WhatsApp message binding table
CREATE TABLE IF NOT EXISTS public.openclaw_whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_message_id TEXT UNIQUE NOT NULL,
    agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
    paciente_telefone TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create isolated LGPD patient consent table
CREATE TABLE IF NOT EXISTS public.paciente_consentimentos_lgpd (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE,
    canal TEXT NOT NULL CONSTRAINT chk_lgpd_canal CHECK (canal IN ('whatsapp')),
    status_consentimento TEXT NOT NULL CONSTRAINT chk_lgpd_status CHECK (status_consentimento IN ('aceito', 'recusado', 'revogado')),
    origem TEXT NOT NULL,
    versao_politica TEXT NOT NULL,
    data_consentimento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    data_revogacao TIMESTAMPTZ,
    evento_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_lgpd_revogacao CHECK (status_consentimento <> 'revogado' OR data_revogacao IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_lgpd_consent_paciente ON public.paciente_consentimentos_lgpd(paciente_id);
CREATE INDEX IF NOT EXISTS idx_lgpd_consent_status ON public.paciente_consentimentos_lgpd(status_consentimento);

-- 5. Create database rate limits table
CREATE TABLE IF NOT EXISTS public.openclaw_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_id TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1,
    expires_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT unq_openclaw_rate_limit UNIQUE (key_id, window_start)
);

CREATE INDEX IF NOT EXISTS idx_openclaw_rate_limit_expires ON public.openclaw_rate_limits(expires_at);

-- 6. Retrofit openclaw_idempotency_keys safely
ALTER TABLE public.openclaw_idempotency_keys ADD COLUMN IF NOT EXISTS api_key_id TEXT;
ALTER TABLE public.openclaw_idempotency_keys ADD COLUMN IF NOT EXISTS method TEXT;
ALTER TABLE public.openclaw_idempotency_keys ADD COLUMN IF NOT EXISTS endpoint TEXT;
ALTER TABLE public.openclaw_idempotency_keys ADD COLUMN IF NOT EXISTS request_hash TEXT;
ALTER TABLE public.openclaw_idempotency_keys ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';

UPDATE public.openclaw_idempotency_keys 
SET 
    api_key_id = COALESCE(api_key_id, 'legacy'),
    method = COALESCE(method, 'POST'),
    endpoint = COALESCE(endpoint, '/'),
    request_hash = COALESCE(request_hash, ''),
    status = COALESCE(status, 'completed');

ALTER TABLE public.openclaw_idempotency_keys ALTER COLUMN api_key_id SET NOT NULL;
ALTER TABLE public.openclaw_idempotency_keys ALTER COLUMN method SET NOT NULL;
ALTER TABLE public.openclaw_idempotency_keys ALTER COLUMN endpoint SET NOT NULL;
ALTER TABLE public.openclaw_idempotency_keys ALTER COLUMN request_hash SET NOT NULL;
ALTER TABLE public.openclaw_idempotency_keys ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.openclaw_idempotency_keys DROP CONSTRAINT IF EXISTS openclaw_idempotency_keys_key_key;
DROP INDEX IF EXISTS public.idx_openclaw_idempotency_keys_key;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unq_openclaw_idempotency_key'
    ) THEN
        ALTER TABLE public.openclaw_idempotency_keys 
        ADD CONSTRAINT unq_openclaw_idempotency_key UNIQUE (api_key_id, key);
    END IF;
END $$;

-- 7. Recreate active appointments unique index
DROP INDEX IF EXISTS public.idx_agendamentos_empresa_data_hora_unico;

CREATE UNIQUE INDEX idx_agendamentos_empresa_data_hora_unico 
ON public.agendamentos (empresa_id, data, hora)
WHERE status IN ('aguardando', 'confirmado');

-- 8. Enable Row Level Security (RLS) & Revoke Anon/Authenticated Access
ALTER TABLE public.openclaw_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.openclaw_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.openclaw_webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.openclaw_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.openclaw_whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paciente_consentimentos_lgpd ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.openclaw_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.openclaw_audit_logs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.openclaw_idempotency_keys FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.openclaw_webhook_deliveries FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.openclaw_webhook_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.openclaw_whatsapp_messages FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.paciente_consentimentos_lgpd FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.openclaw_rate_limits FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.openclaw_audit_logs TO service_role;
GRANT ALL ON public.openclaw_idempotency_keys TO service_role;
GRANT ALL ON public.openclaw_webhook_deliveries TO service_role;
GRANT ALL ON public.openclaw_webhook_events TO service_role;
GRANT ALL ON public.openclaw_whatsapp_messages TO service_role;
GRANT ALL ON public.paciente_consentimentos_lgpd TO service_role;
GRANT ALL ON public.openclaw_rate_limits TO service_role;

-- 9. Atomic RPC function for idempotent appointment creation
CREATE OR REPLACE FUNCTION public.create_agendamento_idempotent(
    p_api_key_id TEXT,
    p_idempotency_key TEXT,
    p_method TEXT,
    p_endpoint TEXT,
    p_request_hash TEXT,
    p_empresa_id INT,
    p_data DATE,
    p_hora TIME,
    p_paciente_nome TEXT,
    p_paciente_telefone TEXT,
    p_tipo TEXT,
    p_observacoes TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_paciente_id UUID;
    v_agendamento_id UUID;
    v_existing RECORD;
    v_result JSONB;
    v_clean_phone TEXT;
BEGIN
    -- 1. Advisory transaction lock for idempotency key
    PERFORM pg_advisory_xact_lock(hashtext('idempotency:' || p_api_key_id || ':' || p_idempotency_key));

    -- 2. Check for existing idempotency key
    SELECT status, request_hash, response_status, response_body INTO v_existing
    FROM public.openclaw_idempotency_keys
    WHERE api_key_id = p_api_key_id AND key = p_idempotency_key;

    IF FOUND THEN
        IF v_existing.request_hash <> p_request_hash THEN
            RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT: Idempotency-Key reutilizada com payload diferente';
        END IF;
        IF v_existing.status = 'pending' THEN
            RAISE EXCEPTION 'IDEMPOTENCY_PENDING: Requisição com esta Idempotency-Key já está em processamento';
        END IF;
        RETURN v_existing.response_body;
    END IF;

    -- 3. Reserve idempotency key in pending status
    INSERT INTO public.openclaw_idempotency_keys (
        api_key_id, key, method, endpoint, request_hash, status, expires_at
    ) VALUES (
        p_api_key_id, p_idempotency_key, p_method, p_endpoint, p_request_hash, 'pending', NOW() + INTERVAL '24 hours'
    );

    -- 4. Normalize phone and acquire patient lock
    v_clean_phone := regexp_replace(p_paciente_telefone, '\D', '', 'g');
    PERFORM pg_advisory_xact_lock(hashtext('patient:' || v_clean_phone));

    -- 5. Find or insert patient
    SELECT id INTO v_paciente_id 
    FROM public.pacientes 
    WHERE regexp_replace(telefone, '\D', '', 'g') = v_clean_phone 
    LIMIT 1;

    IF NOT FOUND THEN
        INSERT INTO public.pacientes (nome, telefone) 
        VALUES (p_paciente_nome, p_paciente_telefone) 
        RETURNING id INTO v_paciente_id;
    END IF;

    -- 6. Insert appointment
    INSERT INTO public.agendamentos (paciente_id, empresa_id, data, hora, tipo, status, observacoes)
    VALUES (v_paciente_id, p_empresa_id, p_data, p_hora, COALESCE(p_tipo, 'Consulta'), 'aguardando', p_observacoes)
    RETURNING id INTO v_agendamento_id;

    v_result := jsonb_build_object(
        'success', true,
        'agendamentoId', v_agendamento_id,
        'status', 'aguardando',
        'mensagem', 'Agendamento criado com sucesso!'
    );

    -- 7. Update idempotency key to completed
    UPDATE public.openclaw_idempotency_keys
    SET status = 'completed', response_status = 201, response_body = v_result
    WHERE api_key_id = p_api_key_id AND key = p_idempotency_key;

    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.create_agendamento_idempotent FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_agendamento_idempotent TO service_role;

-- 10. Database Cleanup Function for Purging Expired Logs & Keys
CREATE OR REPLACE FUNCTION public.clean_expired_openclaw_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deleted_audit INT;
    v_deleted_events INT;
    v_deleted_keys INT;
    v_deleted_limits INT;
BEGIN
    DELETE FROM public.openclaw_audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS v_deleted_audit = ROW_COUNT;

    DELETE FROM public.openclaw_webhook_events WHERE created_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_deleted_events = ROW_COUNT;

    DELETE FROM public.openclaw_idempotency_keys WHERE expires_at < NOW();
    GET DIAGNOSTICS v_deleted_keys = ROW_COUNT;

    DELETE FROM public.openclaw_rate_limits WHERE expires_at < NOW();
    GET DIAGNOSTICS v_deleted_limits = ROW_COUNT;

    RETURN jsonb_build_object(
        'deletedAuditLogs', v_deleted_audit,
        'deletedWebhookEvents', v_deleted_events,
        'deletedIdempotencyKeys', v_deleted_keys,
        'deletedRateLimits', v_deleted_limits,
        'executedAt', NOW()
    );
END;
$$;

REVOKE ALL ON FUNCTION public.clean_expired_openclaw_data FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clean_expired_openclaw_data TO service_role;
