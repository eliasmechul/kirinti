// Kırıntı uygulaması: Supabase'e bağlı. Ödeme henüz simüle (iyzico/PayTR sonra).
const SUPABASE_URL = 'https://dkcwjgonziqizaouypsd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_U8w5lw--srZQ9auJAeLTIQ_oxR065hS'; // herkese açık anahtar; güvenlik RLS kurallarında
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hm = t => String(t).slice(0, 5);
const todayTR = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
const nowTR = () => new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' });
const money = n => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const toast = t => { const el = $('#toast'); el.textContent = t; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600); };
const km = ([a, b], [c, d]) => {
  const r = x => x * Math.PI / 180, h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
const S = 'viewBox="0 0 24 24" aria-hidden="true"';
const ICON = {
  heart: `<svg ${S}><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg>`,
  back: `<svg ${S}><path d="M15 5l-7 7 7 7"/></svg>`,
  share: `<svg ${S}><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6"/></svg>`,
  close: `<svg ${S}><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  clock: `<svg class="i" ${S}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  bag: `<svg class="i" ${S}><path d="M6 8h12l1 12H5z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>`,
  pin: `<svg class="i" ${S}><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`,
  chevR: `<svg class="i" style="stroke:var(--mut);width:18px;height:18px" ${S}><path d="M9 6l6 6-6 6"/></svg>`,
  chevD: `<svg ${S} style="width:18px;height:18px;fill:none;stroke:var(--ink);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round"><path d="M6 9l6 6 6-6"/></svg>`,
  go: `<svg ${S}><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
  nav: `<svg ${S}><path d="M3 11l18-8-8 18-2-8z"/></svg>`,
  locate: `<svg ${S}><path d="M3 11l18-8-8 18-2-8z"/></svg>`,
  home: `<svg ${S}><path d="M4 11l8-7 8 7v9H4z"/></svg>`,
  work: `<svg ${S}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2"/></svg>`,
  other: `<svg ${S}><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`,
};

const DEFAULT_LOC = [40.9908, 29.0290];
let user = null, bags = [], myOrders = [], myBiz = null, pending = null, ratings = {}, myReviews = {};
let cat = 'hepsi', query = '', me = DEFAULT_LOC, locMode = 'preset', selId = null;
let favs = [], SECTIONS = {};
try { favs = JSON.parse(localStorage.getItem('kirinti_fav') || '[]'); } catch {}
const saveFavs = () => { try { localStorage.setItem('kirinti_fav', JSON.stringify(favs)); } catch {} };

// ---------- Görsel yardımcılar ----------
// Paketin kendi fotoğrafı yoksa türüne ve adına uygun varsayılan görsel
const photo = p => esc(p.photo_url || defaultPic(p));
function defaultPic(p) {
  const t = p.title, ty = p.businesses.type;
  if (isVeg(p)) return '../assets/visuals/' + (/meyve/i.test(t) ? 'fruit' : 'vegetables') + '.svg';
  if (isBread(p)) return '../assets/visuals/bread.svg';
  if (KAHVALTI.test(t)) return '../assets/photos/breakfast.jpg';
  if (PASTANE.test(t)) return '../assets/photos/cake.jpg';
  if (HAZIR.test(t)) return '../assets/visuals/ready.svg';
  return ty === 'kafe' ? '../assets/photos/coffee.jpg' : '../assets/photos/soup.jpg';
}
const initial = b => esc(b.name.trim()[0] || '?');
const TYPE_NAME = { restoran: 'Restoran', kafe: 'Kafe', firin: 'Fırın', manav: 'Manav', market: 'Market' };
const typeLabel = b => TYPE_NAME[b.type] || 'Restoran';
const dist = p => p._d ??= km(me, [p.businesses.lat, p.businesses.lng]);
const fmtDist = d => d < 1 ? `${Math.max(50, Math.round(d * 10) * 100)} m` : `${d.toFixed(1)} km`;
const pct = p => Math.round((1 - p.price / p.original_price) * 100);
const stars = id => ratings[id] ? `★ ${Number(ratings[id].avg_rating).toFixed(1).replace('.', ',')} (${ratings[id].n})` : '';
const timeLabel = p => isOpen(p) ? 'Şimdi teslim alınabilir' : ended(p) ? 'Süre doldu' : `Bugün ${hm(p.pickup_from)} - ${hm(p.pickup_to)}`;
const isFav = id => favs.includes(id);
const routeUrl = b => `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`;

// ---------- Harita (Leaflet yalnızca gerektiğinde yüklenir) ----------
const LEAFLET = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min';
let leafletReady = null, map = null, meMarker = null, layer = null, mapDirty = true;
const loadLeaflet = () => leafletReady ||= new Promise((ok, fail) => {
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = LEAFLET + '.css'; document.head.append(css);
  const js = document.createElement('script'); js.src = LEAFLET + '.js'; js.onload = ok;
  js.onerror = () => { leafletReady = null; fail(new Error('leaflet')); }; document.head.append(js);
});
async function ensureMap() {
  if (map) return map;
  await loadLeaflet();
  map = L.map('map', { zoomControl: false }).setView(me, 14);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
  meMarker = L.circleMarker(me, { radius: 8, color: '#fff', weight: 3, fillColor: '#2f7cff', fillOpacity: 1 }).addTo(map);
  layer = L.layerGroup().addTo(map);
  return map;
}
function setLocation(coords, label, mode) {
  me = coords; locMode = mode; bags.forEach(p => delete p._d);
  if (map) { map.setView(me, 14); meMarker.setLatLng(me); }
  $('#locName').textContent = label; render();
}
function getPosition(ok) {
  if (!navigator.geolocation) return toast('Bu cihazda konum desteklenmiyor');
  toast('Konumun alınıyor…');
  navigator.geolocation.getCurrentPosition(p => ok([p.coords.latitude, p.coords.longitude]),
    () => toast('Konum izni verilmedi'), { timeout: 8000, maximumAge: 60000 });
}
function useCurrentLocation() {
  getPosition(c => { setLocation(c, 'Şu anki konum', 'current'); closeSheet(); });
}
// Kayıtlı konumlar (Ev / İş / Başka): yalnızca bu cihazda saklanır
let places = {};
try { places = JSON.parse(localStorage.getItem('kirinti_places') || '{}'); } catch {}
const savePlaces = () => { try { localStorage.setItem('kirinti_places', JSON.stringify(places)); } catch {} };
const PLACE_NAME = { home: 'Ev', work: 'İş', other: 'Başka konum' };
function locSheet() {
  const row = (ic, t, sub, tail, attr) => `<button class="locrow" type="button" ${attr}><span class="ic">${ic}</span><span class="t">${t}${sub ? `<small>${sub}</small>` : ''}</span>${tail}</button>`;
  const place = k => places[k]
    ? row(ICON[k], PLACE_NAME[k], 'Kayıtlı konum', `<span class="radio ${locMode === k ? 'on' : ''}"></span>`, `data-loc="${k}"`)
    : row(ICON[k], PLACE_NAME[k], 'Şu anki konumunu kaydet', '<span class="add">Ekle</span>', `data-addplace="${k}"`);
  sheet(`<h3>Konum</h3>
    ${row(ICON.other, 'Seçili konum', 'Kadıköy, İstanbul', `<span class="radio ${locMode === 'preset' ? 'on' : ''}"></span>`, 'data-loc="preset"')}
    ${row(ICON.locate, 'Şu anki konum', '', `<span class="radio ${locMode === 'current' ? 'on' : ''}"></span>`, 'data-loc="current"')}
    ${place('home')}${place('work')}${place('other')}
    <button class="btn sec" id="x" type="button" style="margin-top:8px">Kapat</button>`);
  $('#x').onclick = closeSheet;
}

// ---------- Veri ----------
let loaded = false, loadingBags = null;
const skeleton = () => `<div class="rail">${'<div class="card sk"></div>'.repeat(3)}</div>`;
function loadBags() {
  return loadingBags ||= (async () => {
    if (!loaded) $('#sections').innerHTML = `<div class="sec-h"><h3>Paketler yükleniyor…</h3></div>${skeleton()}`;
    const [{ data, error }, { data: rt }] = await Promise.all([
      sb.from('bags').select('*, businesses(*)').eq('pickup_date', todayTR()),
      sb.from('business_ratings').select('*'),
    ]);
    ratings = Object.fromEntries((rt || []).map(r => [r.business_id, r]));
    if (error) {
      if (!loaded) $('#sections').innerHTML = '<div class="empty"><p>Paketler yüklenemedi. İnternet bağlantını kontrol et.</p><button class="btn small" data-retry type="button" style="margin-top:12px">Tekrar dene</button></div>';
      else toast('Paketler güncellenemedi');
      return;
    }
    loaded = true; bags = data; render();
  })().finally(() => { loadingBags = null; });
}
async function loadMyOrders() {
  if (!user) { myOrders = []; return renderOrders(); }
  const [{ data }, { data: rv }] = await Promise.all([
    sb.from('orders').select('*, bags(title, pickup_date, pickup_from, pickup_to, price, original_price, businesses(id, name, address, lat, lng))').eq('customer_id', user.id).order('created_at', { ascending: false }),
    sb.from('reviews').select('order_id, rating').eq('customer_id', user.id),
  ]);
  myOrders = data || []; myReviews = Object.fromEntries((rv || []).map(r => [r.order_id, r.rating])); renderOrders();
}
async function loadMyBiz() {
  if (!user) { myBiz = null; return renderBiz(); }
  const { data } = await sb.from('businesses').select('*').eq('owner_id', user.id).limit(1);
  myBiz = data?.[0] || null; renderBiz();
}

const isOpen = p => nowTR() >= hm(p.pickup_from) && nowTR() <= hm(p.pickup_to);
const ended = p => nowTR() > hm(p.pickup_to);
const PASTANE = /pasta|kurabiye|börek|tatlı|baklava|poğaça/i;
const SEBZE = /sebze|meyve|manav|domates|elma|portakal|salata/i;
const EKMEK = /ekmek|francala|somun|baget|simit|fırın/i;
const HAZIR = /hazır|menü|ana yemek|çorba|yemek paketi/i;
const isVeg = p => ['manav', 'market'].includes(p.businesses.type) && !EKMEK.test(p.title) || SEBZE.test(p.title);
const isBread = p => p.businesses.type === 'firin' || EKMEK.test(p.title);
const KAHVALTI = /brunch|kahvaltı/i;
function visible() {
  const q = query.trim().toLocaleLowerCase('tr');
  return bags.filter(p => {
    const b = p.businesses;
    if (q && !(b.name + ' ' + p.title).toLocaleLowerCase('tr').includes(q)) return false;
    if (cat === 'restoran' || cat === 'kafe') return b.type === cat;
    if (cat === 'pastane') return PASTANE.test(p.title);
    if (cat === 'sebze') return isVeg(p);
    if (cat === 'ekmek') return isBread(p);
    if (cat === 'hazir') return HAZIR.test(p.title);
    if (cat === 'kahvalti') return KAHVALTI.test(p.title);
    if (cat === 'simdi') return isOpen(p) && p.qty_available > 0;
    return true;
  }).sort((a, b) => dist(a) - dist(b));
}

// ---------- Kartlar ----------
function card(p) {
  const b = p.businesses;
  return `<article class="card" data-id="${p.id}">
    <div class="ph"><img class="cover" src="${photo(p)}" alt="${esc(p.title)}" loading="lazy" decoding="async">
      <span class="tagq ${p.qty_available ? '' : 'out'}">${p.qty_available ? p.qty_available + ' kaldı' : 'Tükendi'}</span>
      <div class="logo-c">${initial(b)}</div></div>
    <div class="body"><div class="top-row"><div class="nm">${esc(b.name)}</div>
      <button class="heart-o ${isFav(b.id) ? 'on' : ''}" data-fav="${b.id}" aria-label="Favorilere ekle veya çıkar" type="button">${ICON.heart}</button></div>
      <div class="ty">${esc(p.title)}${stars(b.id) ? ` · <span class="star">${stars(b.id)}</span>` : ''}</div>
      <div class="when">${timeLabel(p)} · ${fmtDist(dist(p))}</div>
      <div class="pr"><s>${money(p.original_price)} ₺</s><b>${money(p.price)} ₺</b><i class="off">%${pct(p)}</i></div></div></article>`;
}
function rail(id, title, list) {
  if (!list.length) return '';
  SECTIONS[id] = { title, list };
  return `<div class="sec-h"><h3>${title}</h3><button type="button" data-all="${id}">Tümünü gör</button></div><div class="rail">${list.map(card).join('')}</div>`;
}

function render() {
  const list = visible();
  const open = list.filter(p => p.qty_available > 0 && !ended(p));
  const last = [...open].sort((a, b) => hm(a.pickup_to).localeCompare(hm(b.pickup_to)));
  const fresh = [...open].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  SECTIONS = {};
  $('#sections').innerHTML =
    rail('fav', 'Çevrendeki favoriler', open)
    + rail('last', 'Kaçmadan kurtar', last)
    + rail('new', 'Yeni paketler', fresh)
    + rail('past', 'Pastane', open.filter(p => PASTANE.test(p.title)))
    + rail('bread', 'Ekmek & fırın', open.filter(isBread))
    + rail('veg', 'Sebze & meyve', open.filter(isVeg))
    + rail('rest', 'Restoranlar', open.filter(p => p.businesses.type === 'restoran'))
    + rail('kafe', 'Kafeler', open.filter(p => p.businesses.type === 'kafe'))
    + rail('out', 'Tükenenler', list.filter(p => p.qty_available === 0))
    || '<p class="empty">Aramana uygun paket bulunamadı.</p>';
  mapDirty = true; if ($('#tab-gozat').classList.contains('active')) renderMap(list);
  renderFavs();
}

function renderMap(list = visible()) {
  if (!map) return;
  mapDirty = false; layer.clearLayers();
  list.forEach(p => {
    const b = p.businesses, out = !p.qty_available;
    const icon = L.divIcon({ className: '', iconSize: [0, 0],
      html: `<div class="pricepin ${p.id === selId ? 'sel' : ''} ${out ? 'out' : ''}">${money(p.price)} ₺ <small>· ${p.qty_available}</small></div>` });
    L.marker([b.lat, b.lng], { icon }).addTo(layer).on('click', () => { selId = p.id; renderMap(list); });
  });
  renderPick();
}
function renderPick() {
  const p = bags.find(x => x.id === selId);
  $('#pick').innerHTML = p ? `<article class="card" data-id="${p.id}"><div class="ph"><img class="cover" src="${photo(p)}" alt="" loading="lazy"></div>
    <div class="body" style="padding:12px 14px"><span class="badge">${p.qty_available ? p.qty_available + ' kaldı' : 'Tükendi'}</span>
    <div class="nm" style="margin-top:6px">${esc(p.businesses.name)}</div><div class="ty">${esc(p.title)} · ${fmtDist(dist(p))}</div>
    <div class="when">${timeLabel(p)}</div>
    <div class="pr" style="margin-top:2px"><s>${money(p.original_price)} ₺</s><b>${money(p.price)} ₺</b></div></div></article>` : '';
}
function renderFavs() {
  const el = $('#favs'); if (!el) return;
  const list = bags.filter(p => isFav(p.businesses.id));
  el.innerHTML = list.length ? list.map(card).join('') : '<p class="empty">Henüz favorin yok. Kalbe dokunarak mekânları buraya ekle.</p>';
}

// ---------- Sheet / sayfa ----------
// Panel ve sayfalar tarayıcı geçmişine işlenir; telefonun geri tuşu uygulamadan çıkarmadan bunları kapatır.
let depth = 0, ignorePop = 0;
const afterPop = [];
const pushOverlay = () => { depth++; if (ignorePop) afterPop.push(() => history.pushState({ o: 1 }, '')); else history.pushState({ o: 1 }, ''); };
const popOverlay = () => { if (depth > 0) { depth--; ignorePop++; history.back(); } };
let dmap = null;
function sheet(html) {
  $('#sheetBody').innerHTML = html;
  if ($('#sheet').hidden) { $('#sheet').hidden = false; pushOverlay(); }
  const f = $('#sheetBody').querySelector('input,button'); if (f && !matchMedia('(pointer:coarse)').matches) f.focus();
}
function hideSheet() { $('#sheet').hidden = true; }
function hidePage() { if (dmap) { dmap.remove(); dmap = null; } mapToken++; $('#page').hidden = true; }
function closeSheet() { if (!$('#sheet').hidden) { hideSheet(); popOverlay(); } }
function closePage() { if (!$('#page').hidden) { hidePage(); popOverlay(); } }
function openPage() { if ($('#page').hidden) { $('#page').hidden = false; pushOverlay(); } }
let mapToken = 0;
window.addEventListener('popstate', () => {
  if (ignorePop) { if (!--ignorePop) afterPop.splice(0).forEach(f => f()); return; }
  if (depth > 0) depth--;
  if (!$('#sheet').hidden) hideSheet(); else if (!$('#page').hidden) hidePage();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('#sheet').hidden) closeSheet(); else closePage(); } });
$('.sheet-bg').onclick = closeSheet;

function showList(id) {
  const s = SECTIONS[id]; if (!s) return;
  const pg = $('#page'); pg.className = 'page'; openPage();
  pg.innerHTML = `<div class="l-head"><button class="circ" id="back" type="button" aria-label="Geri">${ICON.back}</button><div class="tt">${esc(s.title)}</div></div>
    <div class="l-body">${s.list.map(card).join('')}</div>`;
  $('#back').onclick = closePage;
}

// ---------- Giriş ----------
function authSheet(msg) {
  sheet(`<h3>Giriş yap / Kayıt ol</h3>${msg ? `<p class="muted" style="text-align:center">${esc(msg)}</p>` : ''}
    <form class="form" id="authForm" style="margin-top:0">
      <input name="email" type="email" required placeholder="E-posta" autocomplete="email" aria-label="E-posta">
      <input name="password" type="password" required minlength="6" placeholder="Şifre (en az 6 karakter)" autocomplete="current-password" aria-label="Şifre">
      <button class="btn" type="submit">Giriş yap</button>
      <button class="btn sec" type="button" id="signup">Kayıt ol</button>
      <button class="linkbtn" type="button" id="forgot">Şifremi unuttum</button></form>
    <button class="btn sec" id="x" type="button">Kapat</button>`);
  $('#x').onclick = closeSheet;
  const creds = () => { const f = new FormData($('#authForm')); return { email: f.get('email'), password: f.get('password') }; };
  $('#authForm').onsubmit = async e => {
    e.preventDefault();
    const btn = e.submitter; btn.disabled = true;
    const { data, error } = await sb.auth.signInWithPassword(creds());
    btn.disabled = false;
    if (error) return toast(error.message.includes('confirm') ? 'E-postanı doğrula' : 'E-posta veya şifre hatalı');
    afterAuth(data.user, 'Giriş yapıldı');
  };
  $('#forgot').onclick = async () => {
    const email = new FormData($('#authForm')).get('email');
    if (!email) return toast('Önce e-posta adresini yaz');
    const { error } = await sb.auth.resetPasswordForEmail(email);
    toast(error ? 'Gönderilemedi, tekrar dene' : 'Şifre yenileme bağlantısı e-postana gönderildi');
  };
  $('#signup').onclick = async () => {
    if (!$('#authForm').reportValidity()) return;
    const { data, error } = await sb.auth.signUp(creds());
    if (error) return toast(error.message);
    if (!data.session) toast('Kayıt tamam. E-postanı doğrula.'); else afterAuth(data.user, 'Hoş geldin!');
  };
}
// Girişten sonra yarım kalan rezervasyona kaldığı yerden devam et
function afterAuth(u, msg) {
  user = u; renderAuthBars(); closeSheet(); toast(msg);
  const p = pending; pending = null;
  if (p) setTimeout(() => confirmSheet(p.p, p.q), 250);
}
function renderAuthBars() {
  document.querySelectorAll('.authbar').forEach(el => {
    el.innerHTML = user
      ? `<div class="me"><span class="av">${esc((user.email || '?')[0].toUpperCase())}</span><div><b>${esc(user.email)}</b><small>${myOrders.length} sipariş · ${favs.length} favori</small></div><button class="btn small sec" data-out type="button">Çıkış</button></div>${(() => { const m = impact(); return m.meals ? `<div class="impact"><div><b>${m.meals}</b><small>öğün kurtardın</small></div><div><b>${money(m.saved)} ₺</b><small>tasarruf</small></div><div><b>${m.co2.toFixed(1).replace('.', ',')} kg</b><small>CO₂ azaldı*</small></div><p>*Kurtarılan öğün başına ortalama 2,5 kg CO₂e varsayımıyla.</p></div>` : ''; })()}`
      : `<button class="btn small" data-in type="button">Giriş yap / Kayıt ol</button>`;
  });
}
// Giriş yapınca cihazdaki favorilerle hesaptaki favorileri birleştir
async function syncFavs() {
  if (!user) return;
  const { data } = await sb.from('favorites').select('business_id');
  const remote = (data || []).map(r => r.business_id), merged = [...new Set([...remote, ...favs])];
  const add = merged.filter(x => !remote.includes(x));
  if (add.length) await sb.from('favorites').insert(add.map(id => ({ user_id: user.id, business_id: id })));
  favs = merged; saveFavs(); render(); renderAuthBars();
}
sb.auth.onAuthStateChange((_ev, session) => {
  user = session?.user || null;
  renderAuthBars();
  setTimeout(() => { loadMyOrders(); loadMyBiz(); syncFavs(); }, 0);
  if (!user) pending = null;
});
function toggleFav(id) {
  favs = isFav(id) ? favs.filter(x => x !== id) : [...favs, id];
  if (user) (isFav(id) ? sb.from('favorites').insert({ user_id: user.id, business_id: id }) : sb.from('favorites').delete().eq('business_id', id)).then(() => {});
  saveFavs(); renderFavs(); renderAuthBars();
  document.querySelectorAll(`[data-fav="${id}"]`).forEach(h => h.classList.toggle('on', isFav(id)));
  toast(isFav(id) ? 'Favorilere eklendi' : 'Favorilerden çıkarıldı');
}
async function share(p) {
  const data = { title: p.businesses.name, text: `${p.title} · ${money(p.price)} ₺`, url: location.href };
  if (navigator.share) { try { await navigator.share(data); } catch {} return; }
  try { await navigator.clipboard.writeText(data.url); toast('Bağlantı kopyalandı'); } catch { toast('Paylaşılamadı'); }
}

// ---------- Paket detay sayfası ----------
function openBag(id) {
  const p = bags.find(x => x.id === id); if (!p) return;
  const b = p.businesses; let q = 1;
  const pg = $('#page'); if (dmap) { dmap.remove(); dmap = null; }
  pg.className = 'page'; openPage();
  const heartC = `<button class="circ ${isFav(b.id) ? 'on' : ''}" data-fav="${b.id}" type="button" aria-label="Favorilere ekle veya çıkar">${ICON.heart}</button>`;
  const catName = isVeg(p) ? 'Sebze & meyve' : isBread(p) ? 'Ekmek & fırın' : PASTANE.test(p.title) ? 'Pastane' : KAHVALTI.test(p.title) ? 'Kahvaltı' : typeLabel(b);
  const info = esc(p.description) || 'Mekânın gün sonunda kalan lezzetli ürünleri.';
  pg.innerHTML = `
    <div class="p-bar" id="pbar"><button class="circ" id="back2" type="button" aria-label="Geri">${ICON.back}</button><div class="tt">${esc(b.name)}</div>
      <button class="circ" id="share2" type="button" aria-label="Paylaş">${ICON.share}</button>${heartC}</div>
    <div class="p-scroll" id="pscroll">
      <div class="p-hero"><img class="cover" src="${photo(p)}" alt="${esc(p.title)}"><div class="fade"></div>
        <div class="acts"><button class="circ" id="back" type="button" aria-label="Geri">${ICON.back}</button>
          <div class="r"><button class="circ" id="share" type="button" aria-label="Paylaş">${ICON.share}</button>${heartC}</div></div>
        <div class="p-badges"><span class="tagq ${p.qty_available ? '' : 'out'}">${p.qty_available ? p.qty_available + ' kaldı' : 'Tükendi'}</span></div>
        <div class="p-name"><i>${initial(b)}</i>${esc(b.name)}</div></div>
      <div class="p-lines">
        <div class="ln">${ICON.bag}<span>Sürpriz paket · ${esc(p.title)}</span><span class="pill-s off">%${pct(p)}</span></div>
        ${stars(b.id) ? `<div class="ln"><span class="star">${stars(b.id)}</span><span class="muted">değerlendirme</span></div>` : ''}
        <div class="ln">${ICON.clock}<span>Teslim: ${hm(p.pickup_from)} - ${hm(p.pickup_to)}</span><span class="pill-s">${isOpen(p) ? 'Şimdi' : 'Bugün'}</span></div>
      </div>
      <a class="p-addr" href="${routeUrl(b)}" target="_blank" rel="noopener">${ICON.pin}
        <div class="a"><b>${esc(b.address) || 'Adres bilgisi yok'}</b><small>${fmtDist(dist(p))} uzaklıkta</small></div>${ICON.chevR}</a>
      <div class="p-sec"><h4>Bu sürpriz paket hakkında</h4><p>${info}</p>
        <span class="chip-c"><img src="${photo(p)}" alt="">${catName}</span></div>
      <div class="p-sec"><h4>Yol tarifi</h4>
        <div style="display:flex;gap:10px;align-items:center;font-size:15px">${ICON.pin}<span>${esc(b.address) || 'Kadıköy, İstanbul'}</span></div>
        <div id="dmap"></div>
        <a class="btn line" style="margin-top:12px" href="${routeUrl(b)}" target="_blank" rel="noopener">Rotayı göster</a></div>
      <div class="p-sec" id="revs" hidden><h4>Yorumlar</h4><div id="revList"></div></div>
      <div class="p-sec"><h4>Teslim bilgisi</h4><p>Siparişini ve teslim kodunu mekândaki bir çalışana göstererek sürpriz paketini teslim al.</p></div>
      <div class="p-sec"><h4>Ambalaj</h4><div class="tip">Kendi çantanı veya kabını getirmeni öneririz.</div>
        <details><summary>İçindekiler ve alerjenler ${ICON.chevD}</summary><p style="padding:6px 0 10px">${info}</p></details></div>
      <div class="p-foot"></div>
    </div>
    <div class="p-cta" id="cta"></div>`;
  const drawCta = () => {
    $('#cta').innerHTML = p.qty_available
      ? `<div class="pc"><s>${money(p.original_price * q)} ₺</s><b>${money(p.price * q)} ₺</b></div>
         <div class="qty-sm"><button id="m" type="button" aria-label="Azalt" ${q <= 1 ? 'disabled' : ''}>−</button><span aria-live="polite">${q}</span><button id="pl" type="button" aria-label="Artır" ${q >= Math.min(p.qty_available, 3) ? 'disabled' : ''}>+</button></div>
         <button class="btn coral" id="buy" type="button">Rezerve et</button>`
      : '<button class="btn" disabled type="button">Tükendi</button>';
    if (p.qty_available) {
      $('#m').onclick = () => { q = Math.max(1, q - 1); drawCta(); };
      $('#pl').onclick = () => { q = Math.min(p.qty_available, 3, q + 1); drawCta(); };
      $('#buy').onclick = () => confirmSheet(p, q);
    }
  };
  drawCta();
  $('#back').onclick = closePage; $('#back2').onclick = closePage;
  $('#share').onclick = () => share(p); $('#share2').onclick = () => share(p);
  const sc = $('#pscroll'), bar = $('#pbar');
  sc.onscroll = () => bar.classList.toggle('show', sc.scrollTop > 150);
  sb.from('reviews').select('rating, comment, created_at').eq('business_id', b.id).not('comment', 'is', null).order('created_at', { ascending: false }).limit(3).then(({ data }) => {
    if (!data?.length || !$('#revList')) return;
    $('#revs').hidden = false;
    $('#revList').innerHTML = data.map(r => `<div class="rev"><span class="star">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span><p>${esc(r.comment)}</p></div>`).join('');
  });
  // küçük harita: kütüphane yüklenince çizilir; sayfa o arada kapandıysa çizilmez
  const tok = ++mapToken;
  loadLeaflet().then(() => {
    if (tok !== mapToken || !$('#dmap')) return;
    dmap = L.map('dmap', { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, attributionControl: false }).setView([b.lat, b.lng], 16);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(dmap);
    L.circleMarker([b.lat, b.lng], { radius: 9, color: '#fff', weight: 3, fillColor: '#FFC93C', fillOpacity: 1 }).addTo(dmap);
  }).catch(() => { const m = $('#dmap'); if (m) m.remove(); });
}

// Kaydırarak onayla
function confirmSheet(p, q) {
  if (!user) { pending = { p, q }; return authSheet('Paket ayırmak için giriş yapmalısın.'); }
  sheet(`<h3>Siparişi onayla</h3>
    <p><b>${q}× ${esc(p.title)}</b><br><span class="muted">${esc(p.businesses.name)} · Bugün ${hm(p.pickup_from)} - ${hm(p.pickup_to)}</span></p>
    <p class="big">${money(p.price * q)} ₺</p>
    <p class="muted">Ödeme şimdilik simüle edilir; gerçek kart tahsilatı yapılmaz.</p>
    <div class="swipe" id="sw" role="button" aria-label="Kaydırarak onayla"><div class="thumb" id="th">${ICON.go}</div><span>Kaydırarak onayla</span></div>
    <button class="btn sec" id="x" type="button">Vazgeç</button>`);
  $('#x').onclick = closeSheet;
  const sw = $('#sw'), th = $('#th');
  let drag = false, x0 = 0, done = false;
  sw.tabIndex = 0;
  sw.onkeydown = async e => { if ((e.key === 'Enter' || e.key === ' ') && !done) { e.preventDefault(); done = true; sw.classList.add('busy'); await reserve(p, q); } };
  const max = () => sw.clientWidth - th.clientWidth - 10;
  th.onpointerdown = e => { drag = true; x0 = e.clientX; th.setPointerCapture(e.pointerId); };
  th.onpointermove = e => { if (drag) th.style.left = 5 + Math.min(max(), Math.max(0, e.clientX - x0)) + 'px'; };
  th.onpointerup = async () => {
    if (!drag) return; drag = false;
    if (!done && parseFloat(th.style.left) - 5 > max() * 0.85) { done = true; th.style.left = max() + 5 + 'px'; sw.classList.add('busy'); await reserve(p, q); }
    else th.style.left = '5px';
  };
}

async function reserve(p, q) {
  const { data: o, error } = await sb.rpc('reserve_bag', { p_bag_id: p.id, p_qty: q });
  if (error) { toast(/stock|stok|yeterli/i.test(error.message) ? 'Üzgünüz, paket az önce tükendi' : error.message); closeSheet(); return loadBags(); }
  closeSheet();
  await Promise.all([loadBags(), loadMyOrders()]);
  showCode(o, p);
}

// Teslim kodu ekranı
function showCode(o, p) {
  const b = p.businesses, pg = $('#page');
  if (dmap) { dmap.remove(); dmap = null; } mapToken++;
  pg.className = 'page teal'; openPage();
  pg.innerHTML = `<button class="x" id="back" type="button" aria-label="Kapat">${ICON.close}</button>
    <div class="ready"><h2>Paketin hazır</h2><p>${esc(b.name)} · Bugün ${hm(p.pickup_from)} - ${hm(p.pickup_to)}</p></div>
    <div class="codecard"><div class="k">Teslim kodu</div><div class="codebox">${esc(o.code)}</div><hr>
      <div class="ln"><span>${o.qty}× ${esc(p.title)}</span><b>${money(o.total)} ₺</b></div>
      <div class="ln" style="margin-top:6px;color:var(--mut);font-size:13px"><span>${esc(b.address) || ''}</span></div></div>
    <a class="route" href="${routeUrl(b)}" target="_blank" rel="noopener">${ICON.nav}Yol tarifi al</a>
    <p class="note">Yemeğini teslim alırken bu kodu mekâna göster.</p>
    <button class="btn" id="ok" type="button">Tamam</button>`;
  $('#back').onclick = closePage; $('#ok').onclick = closePage;
}

// ---------- Siparişler ----------
const canCancel = o => {
  const g = o.bags; if (o.status !== 'bekliyor') return false;
  return g.pickup_date > todayTR() || (g.pickup_date === todayTR() && nowTR() < hm(g.pickup_from));
};
const orderDone = o => o.status !== 'bekliyor' || (o.bags.pickup_date < todayTR() || (o.bags.pickup_date === todayTR() && nowTR() > hm(o.bags.pickup_to)));
function impact() {
  const got = myOrders.filter(o => o.status === 'teslim');
  const meals = got.reduce((a, o) => a + o.qty, 0);
  const saved = got.reduce((a, o) => a + (o.bags.original_price - o.bags.price) * o.qty, 0);
  return { meals, saved, co2: meals * 2.5 };
}
function orderCard(o) {
  const p = o.bags, live = !orderDone(o);
  const when = `Teslim: ${hm(p.pickup_from)} - ${hm(p.pickup_to)} · ${new Date(o.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}`;
  let foot = '';
  if (o.status === 'teslim') foot = `<span class="badge">Teslim alındı</span>` + (myReviews[o.id]
    ? `<span class="star">${'★'.repeat(myReviews[o.id])}${'☆'.repeat(5 - myReviews[o.id])}</span>`
    : `<div><button class="btn small" data-rate="${o.id}" type="button">Puanla</button></div>`);
  else if (o.status === 'iptal') foot = '<span class="badge off">İptal edildi · iade edilecek</span>';
  else if (o.status === 'gelmedi' || !live) foot = '<span class="badge off">Teslim alınmadı</span>';
  else foot = `<span class="muted">Kodu mekâna göstermek için dokun</span><div class="codebox">${esc(o.code)}</div>`
    + (canCancel(o) ? `<div><button class="btn small sec" data-cancel="${o.id}" type="button">Siparişi iptal et</button></div>` : '');
  return `<div class="order" ${live ? `data-oid="${o.id}" style="cursor:pointer"` : ''}><b>${esc(p.businesses.name)}</b>
    <span class="muted">${o.qty}× ${esc(p.title)} · ${money(o.total)} ₺</span><span class="muted">${when}</span>${foot}</div>`;
}
function renderOrders() {
  $('#orders').innerHTML = !user ? '<button class="btn small" data-in type="button">Giriş yap</button><p class="empty">Siparişlerini görmek için giriş yap.</p>'
    : myOrders.length ? (() => {
      const act = myOrders.filter(o => !orderDone(o)), past = myOrders.filter(orderDone);
      return (act.length ? `<h3 class="sub" style="margin-top:0">Aktif</h3>${act.map(orderCard).join('')}` : '')
        + (past.length ? `<h3 class="sub">Geçmiş</h3>${past.map(orderCard).join('')}` : '');
    })() : '<p class="empty">Henüz siparişin yok. Bir paket kurtar!</p>';
  renderAuthBars();
}
async function cancelOrder(id) {
  if (!confirm('Siparişi iptal etmek istiyor musun? Ödemen iade edilir.')) return;
  const { error } = await sb.rpc('cancel_order', { p_order_id: id });
  if (error) return toast(error.message);
  toast('Sipariş iptal edildi'); await Promise.all([loadMyOrders(), loadBags()]);
}
function rateSheet(id) {
  const o = myOrders.find(x => x.id === id); if (!o) return;
  let r = 0;
  sheet(`<h3>${esc(o.bags.businesses.name)}</h3><p class="muted" style="text-align:center">Paketini nasıl buldun?</p>
    <div class="stars-in" id="starsIn" role="radiogroup" aria-label="Puan">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-s="${n}" role="radio" aria-checked="false" aria-label="${n} yıldız">★</button>`).join('')}</div>
    <textarea id="rcomment" class="rtext" maxlength="300" placeholder="Yorum (isteğe bağlı)" aria-label="Yorum"></textarea>
    <button class="btn" id="rsend" type="button" disabled>Gönder</button><button class="btn sec" id="x" type="button">Vazgeç</button>`);
  $('#x').onclick = closeSheet;
  $('#starsIn').onclick = e => {
    const b = e.target.closest('[data-s]'); if (!b) return; r = +b.dataset.s;
    document.querySelectorAll('#starsIn button').forEach(x => { const on = +x.dataset.s <= r; x.classList.toggle('on', on); x.setAttribute('aria-checked', +x.dataset.s === r); });
    $('#rsend').disabled = false;
  };
  $('#rsend').onclick = async () => {
    $('#rsend').disabled = true;
    const { error } = await sb.rpc('rate_order', { p_order_id: id, p_rating: r, p_comment: $('#rcomment').value });
    if (error) { $('#rsend').disabled = false; return toast(error.message); }
    closeSheet(); toast('Teşekkürler!'); loadMyOrders(); loadBags();
  };
}

// ---------- İşletme paneli ----------
// Fotoğrafı küçültüp (en fazla 1200px) JPEG olarak Supabase Storage'a yükler
async function uploadPhoto(file, bizId) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.82));
  const path = `${bizId}/${Date.now()}.jpg`;
  const { error } = await sb.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  return sb.storage.from('photos').getPublicUrl(path).data.publicUrl;
}

const DAYS = { all: [1, 2, 3, 4, 5, 6, 7], wd: [1, 2, 3, 4, 5], we: [6, 7] };
const dayLabel = a => a.length === 7 ? 'Her gün' : a.join() === '1,2,3,4,5' ? 'Hafta içi' : a.join() === '6,7' ? 'Hafta sonu' : a.map(d => 'PztSalÇarPerCumCmtPaz'.slice((d - 1) * 3, d * 3)).join(' ');
async function renderBiz() {
  const root = $('#bizRoot');
  if (!user) return root.innerHTML = '<p class="muted">İşletme paneli için giriş yap.</p>';
  if (!myBiz) {
    root.innerHTML = `<form class="form" id="bizForm"><h3>İşletmeni kaydet</h3>
      <input name="name" required placeholder="İşletme adı" aria-label="İşletme adı">
      <select name="type" aria-label="Tür"><option value="restoran">Restoran / Lokanta</option><option value="kafe">Kafe</option><option value="firin">Fırın / Pastane</option><option value="manav">Manav</option><option value="market">Market</option></select>
      <input name="address" placeholder="Adres" aria-label="Adres">
      <button class="btn sec" id="bizLoc" type="button">Konumumu kullan</button>
      <p class="muted" id="bizLocNote">Mekânda isen "Konumumu kullan"a bas. Aksi hâlde seçili konum (${esc($('#locName').textContent)}) kullanılır.</p>
      <button class="btn" type="submit">Kaydet</button></form>`;
    let bizPos = null;
    $('#bizLoc').onclick = () => getPosition(c => { bizPos = c; $('#bizLocNote').textContent = 'Konum alındı ✓'; });
    $('#bizForm').onsubmit = async e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target)), c = bizPos || me;
      const { error } = await sb.from('businesses').insert({ owner_id: user.id, name: f.name, type: f.type, address: f.address, lat: c[0], lng: c[1] });
      if (error) return toast(error.message);
      toast('İşletme kaydedildi'); await loadMyBiz(); loadBags();
    };
    return;
  }
  await sb.rpc('publish_my_templates');   // bugünün tekrarlayan paketlerini yayınla
  const [{ data: mine }, { data: ords }, { data: tpls }, { data: st }] = await Promise.all([
    sb.from('bags').select('*').eq('business_id', myBiz.id).eq('pickup_date', todayTR()),
    sb.from('orders').select('*, bags!inner(title, business_id, pickup_date)').eq('bags.business_id', myBiz.id).order('created_at', { ascending: false }).limit(40),
    sb.from('bag_templates').select('*').eq('business_id', myBiz.id).order('created_at'),
    sb.rpc('business_stats', { p_business: myBiz.id }),
  ]);
  const t = st || {};
  const tile = (v, l) => `<div><b>${v}</b><small>${l}</small></div>`;
  const live = (ords || []).filter(o => o.status === 'bekliyor'), past = (ords || []).filter(o => o.status !== 'bekliyor');
  root.innerHTML = `<p><b>${esc(myBiz.name)}</b> <span class="muted">· ${esc(myBiz.address)}</span></p>
    <div class="stats">${tile(t.today_orders ?? 0, 'bugün sipariş')}${tile(t.today_delivered ?? 0, 'bugün teslim')}${tile(money(t.today_revenue ?? 0) + ' ₺', 'bugünkü kazanç')}${tile(t.total_meals ?? 0, 'kurtarılan öğün')}${tile(t.avg_rating ? '★ ' + String(t.avg_rating).replace('.', ',') : '–', (t.reviews ?? 0) + ' yorum')}${tile(t.no_shows ?? 0, 'gelmeyen')}</div>
    <p class="muted" style="margin-top:8px">Kazanç, %30 komisyon düşüldükten sonraki tutardır (ödeme henüz simüle).</p>
    <form id="bagForm" class="form"><h3>Yeni sürpriz paket</h3>
      <input name="title" required placeholder="Paket adı (örn. Akşam Yemeği Paketi)" aria-label="Paket adı">
      <input name="desc" placeholder="Kısa açıklama / alerjen bilgisi" aria-label="Açıklama">
      <div class="row2"><input name="orig" type="number" min="1" required placeholder="Normal ₺" aria-label="Normal fiyat"><input name="price" type="number" min="1" required placeholder="İndirimli ₺" aria-label="İndirimli fiyat"></div>
      <div class="row2"><input name="qty" type="number" min="1" max="50" required placeholder="Adet" aria-label="Adet"><input name="from" type="time" required value="21:00" aria-label="Başlangıç"><input name="to" type="time" required value="22:00" aria-label="Bitiş"></div>
      <label class="f">Tekrar<select name="repeat"><option value="none">Yalnızca bugün</option><option value="all">Her gün</option><option value="wd">Hafta içi</option><option value="we">Hafta sonu</option></select></label>
      <label class="f">Paket fotoğrafı (isteğe bağlı)<input name="photo" type="file" accept="image/jpeg,image/png,image/webp"></label>
      <button class="btn" type="submit">Yayınla</button></form>
    ${(tpls || []).length ? `<h3 class="sub">Tekrarlayan paketler</h3>${tpls.map(x => `<div class="order"><b>${esc(x.title)}</b>
      <span class="muted">${dayLabel(x.weekdays)} · ${hm(x.pickup_from)} - ${hm(x.pickup_to)} · ${x.qty} adet · ${money(x.price)} ₺</span>
      <div class="row2"><button class="btn small sec" data-tact="${x.id}" data-on="${x.active}" type="button">${x.active ? 'Duraklat' : 'Devam ettir'}</button><button class="btn small sec" data-tdel="${x.id}" type="button">Sil</button></div></div>`).join('')}` : ''}
    <h3 class="sub">Bugünkü paketler</h3>
    ${(mine || []).map(p => `<div class="order"><b>${esc(p.title)}</b>
      <span class="muted">${money(p.price)} ₺ (normal ${money(p.original_price)} ₺) · ${hm(p.pickup_from)} - ${hm(p.pickup_to)} · ${p.qty_available} adet kaldı</span>
      <div><button class="btn small sec" data-del="${p.id}" type="button">Kaldır</button></div></div>`).join('') || '<p class="muted">Aktif paket yok.</p>'}
    <h3 class="sub">Teslim bekleyen siparişler</h3>
    ${live.map(o => `<div class="order"><b>${o.qty}× ${esc(o.bags.title)}</b>
      <div class="row2"><input data-code="${o.id}" placeholder="Müşteri kodu" inputmode="numeric" maxlength="4" aria-label="Müşteri kodu" style="min-height:44px;border:2px solid var(--line);border-radius:12px;padding:0 12px;width:100%"><button class="btn small" data-ok="${o.id}" type="button">Onayla</button></div></div>`).join('') || '<p class="muted">Bekleyen sipariş yok.</p>'}
    ${past.length ? `<h3 class="sub">Geçmiş siparişler</h3>${past.slice(0, 15).map(o => `<div class="order"><b>${o.qty}× ${esc(o.bags.title)}</b><span class="badge ${o.status === 'teslim' ? '' : 'off'}">${{ teslim: 'Teslim edildi', iptal: 'İptal edildi', gelmedi: 'Gelmedi' }[o.status]}</span></div>`).join('')}` : ''}`;
  $('#bagForm').onsubmit = async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target)), btn = e.submitter; btn.disabled = true;
    try {
      if (+f.price >= +f.orig) return toast('İndirimli fiyat normalden düşük olmalı');
      if (f.to <= f.from) return toast('Bitiş saati başlangıçtan sonra olmalı');
      let photo_url = null;
      if (f.photo && f.photo.size) {
        try { photo_url = await uploadPhoto(f.photo, myBiz.id); } catch { return toast('Fotoğraf yüklenemedi'); }
      }
      if (f.repeat !== 'none') {
        const { error } = await sb.from('bag_templates').insert({ business_id: myBiz.id, title: f.title, description: f.desc, original_price: +f.orig, price: +f.price, qty: +f.qty, pickup_from: f.from, pickup_to: f.to, weekdays: DAYS[f.repeat], photo_url });
        if (error) return toast(error.message);
        await sb.rpc('publish_my_templates');
        toast('Tekrarlayan paket kaydedildi');
      } else {
        const { error } = await sb.from('bags').insert({ business_id: myBiz.id, title: f.title, description: f.desc, original_price: +f.orig, price: +f.price, qty_available: +f.qty, pickup_from: f.from, pickup_to: f.to, photo_url });
        if (error) return toast(error.message);
        toast('Paket yayınlandı');
      }
      renderBiz(); loadBags();
    } finally { btn.disabled = false; }
  };
}

// ---------- Gezinme ve olaylar ----------
function setTab(name) {
  document.querySelectorAll('.tabbar button').forEach(x => x.classList.toggle('on', x.dataset.t === name));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + name));
  closePage(); closeSheet();
  if (name === 'gozat') {
    ensureMap().then(() => { map.invalidateSize(); map.setView(me, 14); if (mapDirty) renderMap(); })
      .catch(() => toast('Harita yüklenemedi'));
  }
}
document.querySelectorAll('.tabbar button').forEach(btn => btn.onclick = () => setTab(btn.dataset.t));
$('#toList').onclick = () => setTab('kesfet');
$('#locBtn').onclick = locSheet;
// İki arama kutusu (Keşfet ve Gözat) birbirine bağlı; yazarken liste her tuşta değil, kısa bir beklemeden sonra yenilenir
let qTimer;
const onSearch = e => {
  query = e.target.value; $('#q').value = $('#q0').value = query;
  clearTimeout(qTimer); qTimer = setTimeout(render, 160);
};
$('#q').oninput = $('#q0').oninput = onSearch;
$('#cats').onclick = e => {
  const b = e.target.closest('button[data-c]'); if (!b) return; cat = b.dataset.c;
  document.querySelectorAll('#cats button').forEach(x => x.classList.toggle('on', x === b)); render();
};
document.addEventListener('click', async e => {
  const t = e.target;
  if (t.closest('[data-in]')) return authSheet();
  if (t.closest('[data-out]')) { e.preventDefault(); return sb.auth.signOut(); }
  if (t.closest('[data-retry]')) return loadBags();
  const ap = t.closest('[data-addplace]');
  if (ap) return getPosition(c => { places[ap.dataset.addplace] = c; savePlaces(); setLocation(c, PLACE_NAME[ap.dataset.addplace], ap.dataset.addplace); closeSheet(); toast('Konum kaydedildi'); });
  const loc = t.closest('[data-loc]');
  if (loc) {
    const k = loc.dataset.loc;
    if (k === 'preset') { setLocation(DEFAULT_LOC, 'Kadıköy', 'preset'); closeSheet(); }
    else if (k === 'current') useCurrentLocation();
    else if (places[k]) { setLocation(places[k], PLACE_NAME[k], k); closeSheet(); }
    return;
  }
  const all = t.closest('[data-all]');
  if (all) return showList(all.dataset.all);
  const fav = t.closest('[data-fav]');
  if (fav) { e.stopPropagation(); return toggleFav(fav.dataset.fav); }
  const c = t.closest('.card[data-id]');
  if (c) return openBag(c.dataset.id);
  const cx = t.closest('[data-cancel]'); if (cx) return cancelOrder(cx.dataset.cancel);
  const rt = t.closest('[data-rate]'); if (rt) return rateSheet(rt.dataset.rate);
  const od = t.closest('.order[data-oid]');
  if (od) { const o = myOrders.find(x => x.id === od.dataset.oid); if (o) showCode(o, o.bags); }
});
$('#tab-profil').addEventListener('click', async e => {
  const del = e.target.dataset.del, ok = e.target.dataset.ok;
  if (e.target.dataset.tact) {
    const { error } = await sb.from('bag_templates').update({ active: e.target.dataset.on !== 'true' }).eq('id', e.target.dataset.tact);
    if (!error) renderBiz(); else toast(error.message);
  }
  if (e.target.dataset.tdel) {
    if (!confirm('Tekrarlayan paketi silmek istiyor musun? Bugünkü paket etkilenmez.')) return;
    const { error } = await sb.from('bag_templates').delete().eq('id', e.target.dataset.tdel);
    if (!error) renderBiz(); else toast(error.message);
  }
  if (del) {
    if (!confirm('Bu paketi kaldırmak istiyor musun?')) return;
    const { error } = await sb.from('bags').delete().eq('id', del);
    if (error) toast('Siparişi olan paket silinemez'); else { renderBiz(); loadBags(); }
  }
  if (ok) {
    const code = document.querySelector(`[data-code="${ok}"]`).value.trim();
    const { data, error } = await sb.rpc('complete_order', { p_order_id: ok, p_code: code });
    if (error) return toast(error.message);
    toast(data ? 'Teslim onaylandı' : 'Kod yanlış'); if (data) renderBiz();
  }
});

renderAuthBars();
loadBags();
// Uygulama arka plandan dönünce ve her 2 dakikada bir paketleri yenile (stok, süre ve gün değişimi için)
document.addEventListener('visibilitychange', () => { if (!document.hidden) loadBags(); });
setInterval(() => { if (!document.hidden) loadBags(); }, 120000);
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
