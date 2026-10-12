// iyzico yardımcıları. Anahtarlar yalnızca Supabase "Secrets" içinde durur, koda yazılmaz.
export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
export const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

export function cfg() {
  const key = Deno.env.get('IYZICO_API_KEY'), secret = Deno.env.get('IYZICO_SECRET_KEY');
  const base = Deno.env.get('IYZICO_BASE_URL') || 'https://sandbox-api.iyzipay.com';
  return key && secret ? { key, secret, base } : null;
}

async function hmacHex(secret: string, msg: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const s = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
  return [...new Uint8Array(s)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// iyzico IYZWSv2 imzası: HMAC-SHA256(secret, randomKey + uriPath + body)
export async function iyzi(c: { key: string; secret: string; base: string }, path: string, body: unknown) {
  const payload = JSON.stringify(body);
  const rnd = `${Date.now()}${crypto.randomUUID().slice(0, 8)}`;
  const sig = await hmacHex(c.secret, rnd + path + payload);
  const auth = 'IYZWSv2 ' + btoa(`apiKey:${c.key}&randomKey:${rnd}&signature:${sig}`);
  const r = await fetch(c.base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: auth, 'x-iyzi-rnd': rnd },
    body: payload,
  });
  return await r.json();
}
