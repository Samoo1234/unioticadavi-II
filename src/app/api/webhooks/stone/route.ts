import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Tipo basico do Payload simulado da Stone (precisará ajustar com a doc real dps)
interface StoneWebhookPayload {
    id: string;
    status: string; // 'paid', 'approved', etc.
    amount: number; // Em centavos (1000 = R$ 10,00) - Valor Bruto
    net_amount: number; // Em centavos - Valor Líquido (Aprovado pelo usuario)
    payment_method: 'pix' | 'credit_card' | 'debit_card';
    created_at: string;
}

export async function POST(request: Request) {
    try {
        const payload: StoneWebhookPayload = await request.json();

        // 1. Validar se o status é pago
        if (payload.status !== 'paid' && payload.status !== 'approved') {
            return NextResponse.json({ received: true, ignored: 'Not a paid event' });
        }

        // 2. Definir o tipo do sistema baseado no payload
        let tipoSistema = '';
        if (payload.payment_method === 'pix') {
            tipoSistema = 'pix';
        } else if (payload.payment_method === 'credit_card' || payload.payment_method === 'debit_card') {
            tipoSistema = 'cartao';
        } else {
             return NextResponse.json({ received: true, ignored: 'Payment method not mapped' });
        }

        // 3. Pegar data de referencia no fuso local ou GMT 0 conforme veio da Stone (simplificado)
        const dateObj = new Date(payload.created_at || new Date().toISOString());
        const dataReferencia = dateObj.toISOString().split('T')[0];

        // O usario escolheu Opcao A: Somar valor liquido
        const valorAdicionadoEmReais = (payload.net_amount || payload.amount) / 100;

        // 4. Descobrir o ID da Categoria no banco
        const { data: catData, error: catError } = await supabase
            .from('cmv_entradas_categorias')
            .select('id')
            .eq('tipo_sistema', tipoSistema)
            .limit(1)
            .single();

        if (catError || !catData) {
            console.error('Categoria nao encontrada para:', tipoSistema);
            return NextResponse.json({ error: 'Category not found' }, { status: 400 });
        }

        // 5. Upsert Somando (Tentar pegar valor atual primeiro, dps somar)
        // OBS: Como não dá pra fazer UPDATE table SET col = col + x numa view normal do supabase-js facilmente no 'upsert' v1, a melhor forma é via RPC (Stored Procedure), 
        // Mas podemos tentar buscar o registro:
        const { data: entradaAtual } = await supabase
            .from('cmv_entradas_diarias')
            .select('valor')
            .eq('data_referencia', dataReferencia)
            .eq('categoria_id', catData.id)
            .single();

        const valorExistente = entradaAtual?.valor || 0;
        const novoValorTotal = valorExistente + valorAdicionadoEmReais;

        const { error: upsertError } = await supabase
            .from('cmv_entradas_diarias')
            .upsert({
                data_referencia: dataReferencia,
                categoria_id: catData.id,
                valor: novoValorTotal
            }, {
                onConflict: 'data_referencia, categoria_id'
            });

        if (upsertError) throw upsertError;

        return NextResponse.json({ success: true, added_value: valorAdicionadoEmReais, total_value: novoValorTotal });

    } catch (error) {
        console.error('Stone Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
