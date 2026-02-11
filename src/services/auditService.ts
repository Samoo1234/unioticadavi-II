import { supabase } from '@/lib/supabase';

export type AuditAction =
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'LOGIN'
    | 'LOGOUT'
    | 'EXPORT'
    | 'SENSITIVE_VIEW';

export const auditService = {
    async log({
        action,
        module,
        recordId,
        previousData,
        newData
    }: {
        action: AuditAction | string;
        module: string;
        recordId?: string;
        previousData?: any;
        newData?: any;
    }) {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) return;

        const { error } = await supabase.from('audit_logs').insert({
            user_id: session.user.id,
            action,
            module,
            record_id: recordId,
            previous_data: previousData,
            new_data: newData
        });

        if (error) {
            console.error('Audit Log Error:', error);
        }
    }
};
