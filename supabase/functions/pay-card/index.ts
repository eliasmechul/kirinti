import { createClient } from 'jsr:@supabase/supabase-js@2';
import { cfg, cors, iyzi, json } from '../_shared/iyzico.ts';

// Kayıtlı kartı sil: önce iyzico'daki kart saklama kaydı silinir, sonra bizdeki anahtar. (Hesap silerken de çağrılır.)
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: { user } } = await userClient.auth.getUser(jwt);
    if (!user) return json({ error: 'auth' }, 401);
    const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: p } = await db.from('payment_profiles').select('card_user_key,card_token').eq('user_id', user.id).maybeSingle();
    if (!p) return json({ ok: true });
    if (p.card_token) {
      const c = cfg();
      if (!c) return json({ error: 'not_configured' });
      const r = await iyzi(c, '/cardstorage/card', { locale: 'tr', conversationId: user.id, cardUserKey: p.card_user_key, cardToken: p.card_token }, 'DELETE');
      if (r.status !== 'success') return json({ error: 'card_delete_failed', detail: r.errorMessage ?? null });
    }
    await db.from('payment_profiles').delete().eq('user_id', user.id);
    return json({ ok: true });
  } catch (e) {
    return json({ error: 'server', detail: String(e) }, 500);
  }
});
