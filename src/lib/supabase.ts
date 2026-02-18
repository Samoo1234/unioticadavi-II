import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (typeof window !== 'undefined') {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        const [resource, config] = args;
        const response = await originalFetch(resource, config);

        if (!response.ok && response.status === 400) {
            try {
                // Clone response to read body without consuming it
                const clone = response.clone();
                const errorBody = await clone.json();

                // Check if it matches the specific error we are hunting
                const errorString = JSON.stringify(errorBody);
                const isTargetError = errorString.includes('at.desc') ||
                    resource.toString().includes('order=at.desc');

                if (isTargetError) {
                    console.error('%c[SUPABASE-DEBUG-TARGET] FOUND THE QUERY!!!', 'background: red; color: white; font-size: 20px', {
                        url: resource.toString(),
                        error: errorBody,
                        stack: new Error().stack
                    });
                } else {
                    console.warn('[SUPABASE-DEBUG] 400 Bad Request:', {
                        url: resource.toString(),
                        error: errorBody
                    });
                }
            } catch (e) {
                console.warn('[SUPABASE-DEBUG] 400 Error (Non-JSON):', resource.toString());
            }
        }
        return response;
    };
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
        flowType: 'pkce'
    }
})
