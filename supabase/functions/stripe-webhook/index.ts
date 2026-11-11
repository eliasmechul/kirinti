import { createClient } from 'jsr:@supabase/supabase-js@2';
import { settleSession, stripeKey, verifyWebhook } from '../_shared/stripe.ts';

// Stripe olayları buraya gelir (verify_jwt: false; güvenlik imza doğrulamasıyla). Yönlendirme sayfası kapatılsa bile ödeme siparişe işlenir.
Deno.serve(async (req) => {
  const key = stripeKey(), secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!key || !secret) return new Response('not configured', { status: 503 });
  const body = await req.text();
  if (!(await verifyWebhook(body, req.headers.get('stripe-signature'), secret))) return new Response('bad signature', { status: 400 });
  try {
    const ev = JSON.parse(body);
    if (ev.type === 'checkout.session.completed' || ev.type === 'checkout.session.async_payment_succeeded') {
      const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      await settleSession(db, key, ev.data.object);
    }
    return new Response('ok');
  } catch (e) {
    return new Response(String(e), { status: 500 });   // Stripe yeniden dener
  }
});
