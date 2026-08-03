-- Migration: OpenClaw V1 Integration Tables & Constraints
-- Data: 2026-08-03

-- 1. Unique index for non-cancelled appointments per company, date, and time
-- Guarantees double-booking prevention directly at PostgreSQL level
CREATE UNIQUE INDEX IF NOT EXISTS idx_agendamentos_empresa_data_hora_unico
ON agendamentos (empresa_id, data, hora)
WHERE status NOT IN ('cancelado', 'recusado');

-- 2. Audit logs table with masked LGPD payloads
CREATE TABLE IF NOT EXISTS openclaw_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id TEXT NOT NULL,
    api_key_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    scope_used TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    action TEXT NOT NULL,
    ip_address TEXT,
    sanitized_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Idempotency keys table to prevent duplicate POST requests
CREATE TABLE IF NOT EXISTS openclaw_idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    request_path TEXT NOT NULL,
    response_status INTEGER NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- Index for quick lookup of active idempotency keys
CREATE INDEX IF NOT EXISTS idx_openclaw_idempotency_keys_key ON openclaw_idempotency_keys(key);

-- 4. Webhook delivery logs table with HMAC verification details
CREATE TABLE IF NOT EXISTS openclaw_webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    target_url TEXT NOT NULL,
    signature TEXT NOT NULL,
    payload JSONB NOT NULL,
    status_code INTEGER,
    response_body TEXT,
    attempts INTEGER DEFAULT 1,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_openclaw_webhook_event ON openclaw_webhook_deliveries(event_type);
