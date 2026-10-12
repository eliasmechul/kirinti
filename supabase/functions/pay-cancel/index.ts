import { createClient } from 'jsr:@supabase/supabase-js@2';
import { cfg, cors, iyzi, json } from '../_shared/iyzico.ts';

// Sipariş iptali: önce iptal edilebilirliği kontrol eder, ödenmişse iyzico'dan iade/iptal yapar, sonra siparişi kapatır.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: { user } } = await userClient.auth.getUser(jwt);
    if (!user) return json({ error: 'auth' }, 401);
    const { order_id } = await req.json();

    const { error: ce } = await userClient.rpc('check_cancel', { p_order_id: order_id });
    if (ce) return json({ error: ce.message });

    const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: o } = await db.from('orders').select('id,customer_id,payment_status,payment_ref,payment_tx,total').eq('id', order_id).maybeSingle();
    if (!o || o.customer_id !== user.id) return json({ error: 'not_found' }, 404);

    if (o.payment_status === 'odendi') {
      const c = cfg();
      if (!c) return json({ error: 'not_configured' });
      const ip = (req.headers.get('x-forwarded-for') || '85.34.78.112').split(',')[0].trim();
      let r = await iyzi(c, '/payment/cancel', { locale: 'tr', conversationId: o.id, paymentId: o.payment_ref, ip });
      if (r.status !== 'success' && o.payment_tx) {
        r = await iyzi(c, '/payment/refund', { locale: 'tr', conversationId: o.id, paymentTransactionId: o.payment_tx, price: Number(o.total).toFixed(2), currency: 'TRY', ip });
      }
      if (r.status !== 'success') return json({ error: 'refund_failed', detail: r.errorMessage ?? null });
    }
    const { error } = await userClient.rpc('cancel_order', { p_order_id: order_id });
    if (error) return json({ error: error.message });
    return json({ ok: true });
  } catch (e) {
    return json({ error: 'server', detail: String(e) }, 500);
  }
});
