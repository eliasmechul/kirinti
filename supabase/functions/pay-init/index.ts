import { createClient } from 'jsr:@supabase/supabase-js@2';
import { cfg, cors, iyzi, json } from '../_shared/iyzico.ts';
import { provider, stripe, stripeKey } from '../_shared/stripe.ts';

// Ödeme başlat: bekleyen siparişin tutarı sunucuda okunur (istemciye güvenilmez), iyzico ödeme sayfası adresi döner.
// Kullanıcının kayıtlı kartı varsa cardUserKey gönderilir; iyzico sayfasında kayıtlı kart hazır gelir.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const useStripe = provider() === 'stripe';
    const c = useStripe ? null : cfg();
    if (!useStripe && !c) return json({ error: 'not_configured' });
    const url = Deno.env.get('SUPABASE_URL')!;
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: { user } } = await userClient.auth.getUser(jwt);
    if (!user) return json({ error: 'auth' }, 401);
    const { order_id } = await req.json();
    const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: o } = await db.from('orders')
      .select('id,customer_id,status,total,qty,pay_expires_at,bags(title)').eq('id', order_id).maybeSingle();
    if (!o || o.customer_id !== user.id) return json({ error: 'not_found' }, 404);
    if (o.status !== 'odeme_bekliyor' || new Date(o.pay_expires_at) < new Date()) return json({ error: 'expired' });

    if (useStripe) {
      // Stripe Checkout: barındırılan ödeme sayfası (Apple/Google Pay dahil, kart bilgisi Kırıntı'ya ulaşmaz)
      const key = stripeKey();
      if (!key) return json({ error: 'not_configured' });
      const site = Deno.env.get('SITE_URL') || 'https://kirinti-app.com';
      const ses = await stripe(key, '/v1/checkout/sessions', {
        mode: 'payment', locale: 'tr', client_reference_id: o.id, customer_email: user.email ?? undefined,
        metadata: { order_id: o.id }, payment_intent_data: { metadata: { order_id: o.id } },
        line_items: [{ quantity: 1, price_data: { currency: 'try', unit_amount: Math.round(Number(o.total) * 100),
          product_data: { name: `${o.qty}x ${(o as any).bags?.title ?? 'Paket'}`.slice(0, 60) } } }],
        success_url: `${url}/functions/v1/pay-callback?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${site}/app/?pay=fail`,
        expires_at: Math.floor(Date.now() / 1000) + 31 * 60,   // Stripe en az 30 dk ister; sipariş 10 dk sonra serbest kalır, geç ödeme iade edilir
      });
      if (!ses.url) return json({ error: 'init_failed', detail: ses.error?.message ?? null });
      await db.from('orders').update({ payment_token: ses.id }).eq('id', o.id);
      return json({ url: ses.url });
    }

    const price = Number(o.total).toFixed(2);
    const ip = (req.headers.get('x-forwarded-for') || '85.34.78.112').split(',')[0].trim();
    const email = user.email ?? 'musteri@kirinti-app.com';
    const name = (email.split('@')[0] || 'Musteri').slice(0, 30);
    const addr = { contactName: name, city: 'Istanbul', country: 'Turkey', address: 'Mekandan teslim (gel-al)' };
    const body: Record<string, unknown> = {
      locale: 'tr', conversationId: o.id, price, paidPrice: price, currency: 'TRY', basketId: o.id, paymentGroup: 'PRODUCT',
      callbackUrl: `${url}/functions/v1/pay-callback`, enabledInstallments: [1],
      buyer: { id: user.id, name, surname: 'Kirinti', identityNumber: '11111111111', email, registrationAddress: 'Mekandan teslim (gel-al)', ip, city: 'Istanbul', country: 'Turkey' },
      shippingAddress: addr, billingAddress: addr,
      basketItems: [{ id: o.id, name: `${o.qty}x ${(o as any).bags?.title ?? 'Paket'}`.slice(0, 60), category1: 'Yemek', itemType: 'PHYSICAL', price }],
    };
    const { data: pp } = await db.from('payment_profiles').select('card_user_key').eq('user_id', user.id).maybeSingle();
    if (pp?.card_user_key) body.cardUserKey = pp.card_user_key;
    const res = await iyzi(c!, '/payment/iyzipos/checkoutform/initialize/auth/ecom', body);
    if (res.status !== 'success' || !res.paymentPageUrl) return json({ error: 'init_failed', detail: res.errorMessage ?? null });
    await db.from('orders').update({ payment_token: res.token }).eq('id', o.id);
    return json({ url: res.paymentPageUrl });
  } catch (e) {
    return json({ error: 'server', detail: String(e) }, 500);
  }
});
