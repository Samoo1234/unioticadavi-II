import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getServiceClient() {
    return createClient(supabaseUrl, supabaseServiceKey)
}

export async function GET(request: NextRequest) {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
        return NextResponse.json({ error: 'Endpoint cron não configurado' }, { status: 503 })
    }

    const authHeader = request.headers.get('authorization')
    let token = ''
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim()
    }

    const tokenBuf = Buffer.from(token, 'utf-8')
    const secretBuf = Buffer.from(cronSecret, 'utf-8')

    if (tokenBuf.length !== secretBuf.length || !crypto.timingSafeEqual(tokenBuf, secretBuf)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    try {
        const supabase = getServiceClient()
        const { data: result, error } = await supabase.rpc('clean_expired_openclaw_data')

        if (error) {
            console.error('[OpenClaw Cron] Erro na função RPC clean_expired_openclaw_data:', error)
            return NextResponse.json({ error: 'Erro ao executar limpeza' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            resultado: result
        })
    } catch (err: any) {
        console.error('[OpenClaw Cron] Erro:', err)
        return NextResponse.json({ error: 'Erro interno ao executar cron de expurgo' }, { status: 500 })
    }
}
