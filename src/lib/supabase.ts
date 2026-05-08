import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!




export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
    },
    cookies: {
        getAll() {
            if (typeof document === 'undefined') return []
            return document.cookie.split(';').map(c => {
                const [name, ...rest] = c.trim().split('=')
                return { name, value: rest.join('=') }
            }).filter(c => c.name)
        },
        setAll(cookiesToSet) {
            if (typeof document === 'undefined') return
            cookiesToSet.forEach(({ name, value }) => {
                // Session cookie: no max-age or expires, so it dies when browser closes
                document.cookie = `${name}=${value}; path=/; SameSite=Lax; Secure`
            })
        }
    }
})
