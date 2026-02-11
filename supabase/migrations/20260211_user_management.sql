-- MIGRAÇÃO: GESTÃO DE USUÁRIOS E PERMISSÕES GRANULARES
-- DATA: 2026-02-11
-- DESCRIÇÃO: Criação das tabelas de Roles, Permissions, Profiles e Audit Logs.

-- 1. Tabelas de Cargos (Roles)
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Permissões
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    UNIQUE(module, action),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela Pivot: Permissões por Cargo
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 4. Tabela de Perfis de Usuários
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    role_id UUID REFERENCES public.roles(id),
    unit_id INT, -- Referência à tabela de Empresas (id integer)
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabela de Logs de Auditoria
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    record_id TEXT,
    previous_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- SEMENTES (SEED DATA)

-- Inserir Cargos Iniciais
INSERT INTO public.roles (name, description) VALUES
('Administrador', 'Acesso total ao sistema'),
('Vendedor', 'Acesso operacional de vendas e clientes'),
('Gerente Financeiro', 'Gestão de contas e caixa'),
('Médico', 'Acesso a prescrições e históricos clínicos')
ON CONFLICT (name) DO NOTHING;

-- Inserir Permissões Iniciais
INSERT INTO public.permissions (module, action) VALUES
('vendas', 'view'), ('vendas', 'create'), ('vendas', 'edit'), ('vendas', 'delete'), ('vendas', 'apply_discount'),
('financeiro', 'view'), ('financeiro', 'create'), ('financeiro', 'edit'), ('financeiro', 'delete'),
('estoque', 'view'), ('estoque', 'edit'),
('pacientes', 'view'), ('pacientes', 'create'), ('pacientes', 'edit'), ('pacientes', 'view_history'),
('admin', 'view_users'), ('admin', 'manage_users'), ('admin', 'view_audit')
ON CONFLICT (module, action) DO NOTHING;

-- Vincular todas as permissões ao Administrador
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'Administrador'
ON CONFLICT DO NOTHING;

-- TRIGGER: Criar perfil automaticamente ao cadastrar usuário no Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role_id)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', (SELECT id FROM public.roles WHERE name = 'Administrador' LIMIT 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- TRIGGER: Atualizar 'updated_at' automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
