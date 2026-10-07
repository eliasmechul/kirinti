// Kırıntı tanıtım sitesi: veritabanına bağlı formlar (işletme başvurusu ve bekleme listesi).
const SUPABASE_URL = 'https://dkcwjgonziqizaouypsd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_U8w5lw--srZQ9auJAeLTIQ_oxR065hS'; // herkese açık anahtar; formlar yalnızca EKLEYEBİLİR, okuyamaz (RLS)
const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Gerçek fotoğraf dosyası yoksa aynı adlı çizime dön (assets/photos/x.jpg yoksa assets/visuals/x.svg)
function photoFallback(i) {
  if (i.tagName !== 'IMG' || i.dataset.fb) return;
  const s = i.getAttribute('src') || '';
  if (/assets\/photos\/[a-z]+\.jpg$/.test(s)) { i.dataset.fb = '1'; i.src = s.replace(/photos\/([a-z]+)\.jpg$/, 'visuals/$1.svg'); }
}
document.addEventListener('error', e => photoFallback(e.target), true);
const sweepPhotos = () => document.querySelectorAll('img').forEach(i => { if (i.complete && i.naturalWidth === 0) photoFallback(i); });
document.addEventListener('DOMContentLoaded', sweepPhotos); window.addEventListener('load', sweepPhotos);

const $ = s => document.querySelector(s);

// ---- Formlar ----
const TABLES = { waitlist: 'waitlist', business: 'business_applications' };
const OK = {
  waitlist: 'Harika! Listeye eklendin; şehrin açılınca haber vereceğiz.',
  business: 'Teşekkürler! Başvurunu aldık, seninle iletişime geçeceğiz.',
};
document.querySelectorAll('form[data-form]').forEach(form => {
  const kind = form.dataset.form;
  const msg = form.parentElement.querySelector('.form-msg') || form.querySelector('.form-msg');
  const say = (t, err) => { msg.textContent = t; msg.classList.toggle('err', !!err); };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (form.website && form.website.value) return;        // bot tuzağı
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (!sb) return say('Bağlantı kurulamadı, lütfen sonra tekrar dene.', true);
    const data = Object.fromEntries(new FormData(form));
    delete data.website;
    const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
    const { error } = await sb.from(TABLES[kind]).insert(data);
    btn.disabled = false;
    if (error && error.code === '23505') return say('Bu e-posta zaten listede. Teşekkürler!');
    if (error) return say('Kaydedilemedi, lütfen tekrar dene.', true);
    form.reset(); say(OK[kind]);
  });
});
