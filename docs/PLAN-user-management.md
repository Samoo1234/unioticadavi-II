# PLAN - User Management & Granular Permissions

Implementation of a secure user management system for **Otica Vision**, featuring RBAC (Role-Based Access Control) with module-level granularity, unit-specific binding, and an audit trail.

## Phase 1: Database Architecture (Supabase/PostgreSQL)

### Table: `profiles`
- `id` (uuid, primary key, references auth.users)
- `full_name` (text)
- `role_id` (uuid, references roles)
- `unit_id` (int, references companies/units)
- `active` (boolean)
- `created_at` / `updated_at`

### Table: `roles`
- `id` (uuid)
- `name` (text) - e.g., 'Administrador', 'Vendedor', 'Gerente Financeiro', 'Médico'
- `description` (text)

### Table: `permissions`
- `id` (uuid)
- `module` (text) - e.g., 'vendas', 'financeiro', 'estoque', 'pacientes'
- `action` (text) - e.g., 'view', 'create', 'edit', 'delete', 'apply_discount'

### Table: `role_permissions`
- `role_id` (uuid)
- `permission_id` (uuid)

### Table: `audit_logs`
- `id` (uuid)
- `user_id` (uuid)
- `action` (text) - e.g., 'DELETE_SALE', 'EDIT_TITLE'
- `module` (text)
- `record_id` (text) - ID of the affected record
- `previous_data` (jsonb)
- `new_data` (jsonb)
- `created_at`

## Phase 2: Auth Middleware & RLS

### 🛡️ Route Protection
- Modify `middleware.ts` to check if a user belongs to the unit they are trying to access (if applicable).
- Implement a `usePermissions` hook to hide/show buttons and sections based on the user's role permissions.

### 🔐 Row Level Security (RLS)
- Implement RLS policies in Supabase so that users can only see records belonging to their assigned `unit_id`.

## Phase 3: Administrative Interface

### [NEW] `/app/admin/users/page.tsx`
- **Users List**: Search and filter by status/role.
- **User Modal**: Add/Edit users, assign role, and unit.
- **Permissions Viewer**: Quick view of what each role can do.

### [NEW] `/app/admin/audit/page.tsx`
- List of system actions with filters by user, period, and module.

## Phase 4: Integration

- Update existing modules (Vendas, Financeiro, etc.) to use the `usePermissions` hook.
- Implement a global `auditService` to be called during critical mutating operations.

## Verification Checklist

### Automated
- [ ] Unit test: Verify `hasPermission` helper logic.
- [ ] Integration: Verify RLS blocks access to other unit's data.

### Manual
- [ ] Log in as 'Vendedor' and verify that 'Financeiro' menu is hidden.
- [ ] Try to delete a sale as 'Vendedor' (without permission) and expect a block.
- [ ] Perform an edit and verify if it appears in the `audit_logs` table.
