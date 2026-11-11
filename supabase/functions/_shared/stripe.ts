// Stripe yardımcıları (Checkout). Anahtarlar yalnızca Supabase "Secrets" içinde durur: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
// Sağlayıcı seçimi: PAY_PROVIDER = 'stripe' | 'iyzico' (varsayılan iyzico).
export const provider = () => (Deno.env.get('PAY_PROVIDER') || 'iyzico').toLowerCase();
export const stripeKey = () => Deno.env.get('STRIPE_SECRET_KEY') || null;

// Stripe isteklerinin gövdesi form-encoded ve iç içe alanlar köşeli parantezle yazılır
function enc(v: unknown, prefix: string, out: string[]) {
  if (v === undefined || v === null) return;
  if (Array.isArray(v)) v.forEach((x, i) => enc(x, `${prefix}[${i}]`, out));
  else if (typeof v === 'object') for (const [k, x] of Object.entries(v)) enc(x, prefix ? `${prefix}[${k}]` : k, out);
  else out.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(v))}`);
}

export async function stripe(key: string, path: string, params?: Record<string, unknown>, method = 'POST') {
  const out: string[] = [];
  if (params) enc(params, '', out);
  const get = method === 'GET';
  const r = await fetch(`https://api.stripe.com${path}${get && out.length ? '?' + out.join('&') : ''}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, ...(get ? {} : { 'Content-Type': 'application/x-www-form-urlencoded' }) },
    body: get ? undefined : out.join('&'),
  });
  return await r.json();
}

async function hmacHex(secret: string, msg: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const s = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
  return [...new Uint8Array(s)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Stripe-Signature: t=<zaman>,v1=<imza>. Gövde değişmemiş ve 5 dakikadan eski olmamalı.
export async function verifyWebhook(body: string, header: string | null, secret: string) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
  const t = parts.t, v1 = parts.v1;
  if (!t || !v1 || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const expected = await hmacHex(secret, `${t}.${body}`);
  return expected.length === v1.length && expected === v1;
}

// Ödenmiş Checkout oturumunu siparişe işler (tekrar çağrılabilir: finalize_payment idempotent).
// Tutar uyuşmazsa veya sipariş artık kesinleştirilemezse parayı iade eder.
// deno-lint-ignore no-explicit-any
export async function settleSession(db: any, key: string, session: any): Promise<'ok' | 'fail'> {
  const orderId = session.client_reference_id || session.metadata?.order_id;
  if (!orderId || session.payment_status !== 'paid') return 'fail';
  const pi = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  const { data: done } = await db.rpc('finalize_payment', {
    p_order_id: orderId, p_ref: String(pi), p_tx: null, p_paid: Number(session.amount_total) / 100,
  });
  if (done) return 'ok';
  if (pi) await stripe(key, '/v1/refunds', { payment_intent: pi });
  await db.rpc('fail_payment', { p_order_id: orderId });
  return 'fail';
}
