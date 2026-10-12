import { createClient } from 'jsr:@supabase/supabase-js@2';
import { cfg, iyzi } from '../_shared/iyzico.ts';

// iyzico ödeme sonrası buraya POST eder (token). Sonucu iyzico'dan DOĞRULAYIP siparişi kesinleştiririz;
// tarayıcıdan gelen hiçbir bilgiye güvenilmez. Sonra kullanıcı uygulamaya yönlendirilir. (verify_jwt: false)
Deno.serve(async (req) => {
  const site = Deno.env.get('SITE_URL') || 'https://kirinti-app.com';
  const back = (q: string) => new Response(null, { status: 303, headers: { Location: `${site}/app/?${q}` } });
  try {
    const c = cfg();
    if (!c) return back('pay=fail');
    const ct = req.headers.get('content-type') || '';
    const token = ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')
      ? String((await req.formData()).get('token') || '')
      : new URL(req.url).searchParams.get('token') || '';
    if (!token) return back('pay=fail');
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: o } = await db.from('orders').select('id,total,status').eq('payment_token', token).maybeSingle();
    if (!o) return back('pay=fail');

    const res = await iyzi(c, '/payment/iyzipos/checkoutform/auth/ecom/detail', { locale: 'tr', conversationId: o.id, token });
    const paid = res.status === 'success' && res.paymentStatus === 'SUCCESS';
    if (paid) {
      const tx = res.itemTransactions?.[0]?.paymentTransactionId ?? null;
      const { data: done } = await db.rpc('finalize_payment', {
        p_order_id: o.id, p_ref: String(res.paymentId), p_tx: tx ? String(tx) : null, p_paid: Number(res.paidPrice),
      });
      if (done) return back(`pay=ok&order=${o.id}`);
      // Para çekildi ama sipariş kesinleştirilemedi (tutar uyuşmazlığı vb.): parayı geri ver
      await iyzi(c, '/payment/cancel', { locale: 'tr', conversationId: o.id, paymentId: String(res.paymentId), ip: '85.34.78.112' });
    }
    await db.rpc('fail_payment', { p_order_id: o.id });
    return back('pay=fail');
  } catch {
    return back('pay=fail');
  }
});
