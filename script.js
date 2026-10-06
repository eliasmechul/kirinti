// Kırıntı tanıtım sitesi: adım carousel'i ve veritabanına bağlı formlar.
const SUPABASE_URL = 'https://dkcwjgonziqizaouypsd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_U8w5lw--srZQ9auJAeLTIQ_oxR065hS'; // herkese açık anahtar; formlar yalnızca EKLEYEBİLİR, okuyamaz (RLS)
const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// ---- Adımlar ----
const STEPS = [
  { t: '1. Adım', p: 'Yakınındaki restoran ve kafelerde kapanıştan önce ayrılan sürpriz paketleri keşfet.', img: 'assets/visuals/baker.svg', alt: 'Fırın tezgâhı', img2: 'assets/visuals/croissant.svg', alt2: 'Taze kruvasan' },
  { t: '2. Adım', p: 'Seçtiğin paketi onayla ve uygulama içinden güvenle öde.', img: 'assets/visuals/coffee.svg', alt: 'Latte', img2: 'assets/visuals/cake.svg', alt2: 'Pasta dilimi' },
  { t: '3. Adım', p: 'Belirtilen saat aralığında mekâna git, kodunu göster ve paketini teslim al.', img: 'assets/visuals/pide.svg', alt: 'Taze pide', img2: 'assets/visuals/lahmacun.svg', alt2: 'Lahmacun' },
  { t: '4. Adım', p: 'Yemeği kurtardın. Hem cüzdanın hem gezegen teşekkür ediyor.', img: 'assets/visuals/breakfast.svg', alt: 'Türk kahvaltısı', img2: 'assets/visuals/meze.svg', alt2: 'Meze tabağı' },
];
let cur = 0;
const $ = s => document.querySelector(s);
function showStep(i) {
  cur = (i + STEPS.length) % STEPS.length;
  const s = STEPS[cur];
  $('#stepTitle').textContent = s.t; $('#stepText').textContent = s.p;
  $('#stepImg').src = s.img; $('#stepImg').alt = s.alt;
  $('#stepImg2').src = s.img2; $('#stepImg2').alt = s.alt2;
  document.querySelectorAll('#dots i').forEach((d, k) => d.classList.toggle('on', k === cur));
}
$('#prev').onclick = () => showStep(cur - 1);
$('#next').onclick = () => showStep(cur + 1);

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
