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
let user = null, bags = [], myOrders = [], myBiz = null;
let cat = 'hepsi', query = '', me = DEFAULT_LOC, locMode = 'preset', selId = null;
let favs = [], SECTIONS = {};
try { favs = JSON.parse(localStorage.getItem('kirinti_fav') || '[]'); } catch {}
const saveFavs = () => { try { localStorage.setItem('kirinti_fav', JSON.stringify(favs)); } catch {} };

// ---------- Görsel yardımcılar ----------
const photo = p => esc(p.photo_url || (p.businesses.type === 'kafe' ? '../assets/visuals/coffee.svg' : '../assets/visuals/soup.svg'));
const initial = b => esc(b.name.trim()[0] || '?');
const typeLabel = b => b.type === 'kafe' ? 'Kafe' : 'Restoran';
const dist = p => km(me, [p.businesses.lat, p.businesses.lng]);
const isFav = id => favs.includes(id);
const routeUrl = b => `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`;

// ---------- Harita ----------
const map = L.map('map', { zoomControl: false }).setView(me, 14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
const meMarker = L.circleMarker(me, { radius: 8, color: '#fff', weight: 3, fillColor: '#2f7cff', fillOpacity: 1 }).addTo(map);
const layer = L.layerGroup().addTo(map);
function setLocation(coords, label, mode) {
  me = coords; locMode = mode; map.setView(me, 14); meMarker.setLatLng(me);
  $('#locName').textContent = label; render();
}
function useCurrentLocation() {
  if (!navigator.geolocation) return toast('Bu cihazda konum desteklenmiyor');
  navigator.geolocation.getCurrentPosition(
    p => { setLocation([p.coords.latitude, p.coords.longitude], 'Şu anki konum', 'current'); closeSheet(); },
    () => toast('Konum izni verilmedi'), { timeout: 6000 });
}
function locSheet() {
  const row = (ic, t, sub, tail, id) => `<button class="locrow" type="button" ${id ? `data-loc="${id}"` : 'data-soon'}><span class="ic">${ic}</span><span class="t">${t}${sub ? `<small>${sub}</small>` : ''}</span>${tail}</button>`;
  sheet(`<h3>Konum</h3>
    ${row(ICON.other, 'Seçili konum', 'Kadıköy, İstanbul', `<span class="radio ${locMode === 'preset' ? 'on' : ''}"></span>`, 'preset')}
    ${row(ICON.locate, 'Şu anki konum', '', `<span class="radio ${locMode === 'current' ? 'on' : ''}"></span>`, 'current')}
    ${row(ICON.home, 'Ev', '', '<span class="add">Ekle</span>')}
    ${row(ICON.work, 'İş', '', '<span class="add">Ekle</span>')}
    ${row(ICON.other, 'Başka konum', '', '<span class="add">Ekle</span>')}
    <button class="btn sec" id="x" type="button" style="margin-top:8px">Kapat</button>`);
  $('#x').onclick = closeSheet;
}

// ---------- Veri ----------
async function loadBags() {
  const { data, error } = await sb.from('bags').select('*, businesses(*)').eq('pickup_date', todayTR());
  if (error) return toast('Paketler yüklenemedi');
  bags = data; render();
}
async function loadMyOrders() {
  if (!user) { myOrders = []; return renderOrders(); }
  const { data } = await sb.from('orders').select('*, bags(title, pickup_from, pickup_to, price, businesses(name, address, lat, lng))').eq('customer_id', user.id).order('created_at', { ascending: false });
  myOrders = data || []; renderOrders();
}
async function loadMyBiz() {
  if (!user) { myBiz = null; return renderBiz(); }
  const { data } = await sb.from('businesses').select('*').eq('owner_id', user.id).limit(1);
  myBiz = data?.[0] || null; renderBiz();
}

const isOpen = p => nowTR() >= hm(p.pickup_from) && nowTR() <= hm(p.pickup_to);
const ended = p => nowTR() > hm(p.pickup_to);
const PASTANE = /pasta|kurabiye|börek|tatlı|baklava|simit|poğaça/i;
const KAHVALTI = /brunch|kahvaltı/i;
function visible() {
  const q = query.trim().toLocaleLowerCase('tr');
  return bags.filter(p => {
    const b = p.businesses;
    if (q && !(b.name + ' ' + p.title).toLocaleLowerCase('tr').includes(q)) return false;
    if (cat === 'restoran' || cat === 'kafe') return b.type === cat;
    if (cat === 'pastane') return PASTANE.test(p.title);
    if (cat === 'kahvalti') return KAHVALTI.test(p.title);
    if (cat === 'simdi') return isOpen(p) && p.qty_available > 0;
    return true;
  }).sort((a, b) => dist(a) - dist(b));
}

// ---------- Kartlar ----------
function card(p) {
  const b = p.businesses;
  return `<article class="card" data-id="${p.id}">
    <div class="ph"><img class="cover" src="${photo(p)}" alt="${esc(p.title)}" loading="lazy">
      <span class="tagq ${p.qty_available ? '' : 'out'}">${p.qty_available ? p.qty_available + ' kaldı' : 'Tükendi'}</span>
      <div class="logo-c">${initial(b)}</div></div>
    <div class="body"><div class="top-row"><div class="nm">${esc(b.name)}</div>
      <button class="heart-o ${isFav(b.id) ? 'on' : ''}" data-fav="${b.id}" aria-label="Favorilere ekle veya çıkar" type="button">${ICON.heart}</button></div>
      <div class="ty">${esc(p.title)}</div>
      <div class="when">Bugün teslim: ${hm(p.pickup_from)} - ${hm(p.pickup_to)} · ${dist(p).toFixed(1)} km</div>
      <div class="pr"><s>${money(p.original_price)} ₺</s><b>${money(p.price)} ₺</b></div></div></article>`;
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
    + rail('rest', 'Restoranlar', open.filter(p => p.businesses.type === 'restoran'))
    + rail('kafe', 'Kafeler', open.filter(p => p.businesses.type === 'kafe'))
    + rail('out', 'Tükenenler', list.filter(p => p.qty_available === 0))
    || '<p class="empty">Aramana uygun paket bulunamadı.</p>';
  renderMap(list);
  renderFavs();
}

function renderMap(list) {
  layer.clearLayers();
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
    <div class="nm" style="margin-top:6px">${esc(p.businesses.name)}</div><div class="ty">${esc(p.title)} · ${dist(p).toFixed(1)} km</div>
    <div class="when">Bugün ${hm(p.pickup_from)} - ${hm(p.pickup_to)}</div>
    <div class="pr" style="margin-top:2px"><s>${money(p.original_price)} ₺</s><b>${money(p.price)} ₺</b></div></div></article>` : '';
}
function renderFavs() {
  const list = bags.filter(p => isFav(p.businesses.id));
  $('#favs').innerHTML = list.length ? list.map(card).join('') : '<p class="empty">Henüz favorin yok. Kalbe dokunarak mekânları buraya ekle.</p>';
}

// ---------- Sheet / sayfa ----------
function sheet(html) { $('#sheetBody').innerHTML = html; $('#sheet').hidden = false; }
const closeSheet = () => { $('#sheet').hidden = true; };
let dmap = null;
const closePage = () => { if (dmap) { dmap.remove(); dmap = null; } $('#page').hidden = true; };
$('.sheet-bg').onclick = closeSheet;

function showList(id) {
  const s = SECTIONS[id]; if (!s) return;
  const pg = $('#page'); pg.className = 'page'; pg.hidden = false;
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
      <button class="btn sec" type="button" id="signup">Kayıt ol</button></form>
    <button class="btn sec" id="x" type="button">Kapat</button>`);
  $('#x').onclick = closeSheet;
  const creds = () => { const f = new FormData($('#authForm')); return { email: f.get('email'), password: f.get('password') }; };
  $('#authForm').onsubmit = async e => {
    e.preventDefault();
    const { error } = await sb.auth.signInWithPassword(creds());
    if (error) return toast(error.message.includes('confirm') ? 'E-postanı doğrula' : 'E-posta veya şifre hatalı');
    closeSheet(); toast('Giriş yapıldı');
  };
  $('#signup').onclick = async () => {
    if (!$('#authForm').reportValidity()) return;
    const { data, error } = await sb.auth.signUp(creds());
    if (error) return toast(error.message);
    if (!data.session) toast('Kayıt tamam. E-postanı doğrula.'); else { closeSheet(); toast('Hoş geldin!'); }
  };
}
function renderAuthBars() {
  document.querySelectorAll('.authbar').forEach(el => {
    el.innerHTML = user
      ? `<p class="muted">${esc(user.email)} · <a href="#" data-out style="color:var(--pink-d)">Çıkış</a></p>`
      : `<button class="btn small" data-in type="button">Giriş yap / Kayıt ol</button>`;
  });
}
sb.auth.onAuthStateChange((_ev, session) => {
  user = session?.user || null;
  renderAuthBars();
  setTimeout(() => { loadMyOrders(); loadMyBiz(); }, 0);
});
function toggleFav(id) {
  favs = isFav(id) ? favs.filter(x => x !== id) : [...favs, id];
  saveFavs(); render();
  document.querySelectorAll(`#page [data-fav="${id}"]`).forEach(h => h.classList.toggle('on', isFav(id)));
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
  pg.className = 'page'; pg.hidden = false;
  const heartC = `<button class="circ ${isFav(b.id) ? 'on' : ''}" data-fav="${b.id}" type="button" aria-label="Favorilere ekle veya çıkar">${ICON.heart}</button>`;
  const catName = PASTANE.test(p.title) ? 'Pastane' : KAHVALTI.test(p.title) ? 'Kahvaltı' : typeLabel(b);
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
        <div class="ln">${ICON.bag}<span>Sürpriz paket · ${esc(p.title)}</span></div>
        <div class="ln">${ICON.clock}<span>Teslim: ${hm(p.pickup_from)} - ${hm(p.pickup_to)}</span><span class="pill-s">Bugün</span></div>
      </div>
      <a class="p-addr" href="${routeUrl(b)}" target="_blank" rel="noopener">${ICON.pin}
        <div class="a"><b>${esc(b.address) || 'Adres bilgisi yok'}</b><small>Mekân hakkında daha fazla bilgi · ${dist(p).toFixed(1)} km</small></div>${ICON.chevR}</a>
      <div class="p-sec"><h4>Bu sürpriz paket hakkında</h4><p>${info}</p>
        <span class="chip-c"><img src="${photo(p)}" alt="">${catName}</span></div>
      <div class="p-sec"><h4>Yol tarifi</h4>
        <div style="display:flex;gap:10px;align-items:center;font-size:15px">${ICON.pin}<span>${esc(b.address) || 'Kadıköy, İstanbul'}</span></div>
        <div id="dmap"></div>
        <a class="btn line" style="margin-top:12px" href="${routeUrl(b)}" target="_blank" rel="noopener">Rotayı göster</a></div>
      <div class="p-sec"><h4>Teslim bilgisi</h4><p>Siparişini ve teslim kodunu mekândaki bir çalışana göstererek sürpriz paketini teslim al.</p></div>
      <div class="p-sec"><h4>Ambalaj</h4><div class="tip">Kendi çantanı veya kabını getirmeni öneririz.</div>
        <details><summary>İçindekiler ve alerjenler ${ICON.chevD}</summary><p style="padding:6px 0 10px">${info}</p></details></div>
      <div class="p-foot"></div>
    </div>
    <div class="p-cta" id="cta"></div>`;
  const drawCta = () => {
    $('#cta').innerHTML = p.qty_available
      ? `<div class="pc"><s>${money(p.original_price * q)} ₺</s><b>${money(p.price * q)} ₺</b></div>
         <div class="qty-sm"><button id="m" type="button" aria-label="Azalt">−</button><span>${q}</span><button id="pl" type="button" aria-label="Artır">+</button></div>
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
  // küçük harita
  dmap = L.map('dmap', { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, attributionControl: false }).setView([b.lat, b.lng], 16);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(dmap);
  L.circleMarker([b.lat, b.lng], { radius: 9, color: '#fff', weight: 3, fillColor: '#F4BD56', fillOpacity: 1 }).addTo(dmap);
}

// Kaydırarak onayla
function confirmSheet(p, q) {
  if (!user) return authSheet('Paket ayırmak için giriş yapmalısın.');
  sheet(`<h3>Siparişi onayla</h3>
    <p><b>${q}× ${esc(p.title)}</b><br><span class="muted">${esc(p.businesses.name)} · Bugün ${hm(p.pickup_from)} - ${hm(p.pickup_to)}</span></p>
    <p class="big">${money(p.price * q)} ₺</p>
    <p class="muted">Ödeme şimdilik simüle edilir; gerçek kart tahsilatı yapılmaz.</p>
    <div class="swipe" id="sw" role="button" aria-label="Kaydırarak onayla"><div class="thumb" id="th">${ICON.go}</div><span>Kaydırarak onayla</span></div>
    <button class="btn sec" id="x" type="button">Vazgeç</button>`);
  $('#x').onclick = closeSheet;
  const sw = $('#sw'), th = $('#th');
  let drag = false, x0 = 0, done = false;
  const max = () => sw.clientWidth - th.clientWidth - 10;
  th.onpointerdown = e => { drag = true; x0 = e.clientX; th.setPointerCapture(e.pointerId); };
  th.onpointermove = e => { if (drag) th.style.left = 5 + Math.min(max(), Math.max(0, e.clientX - x0)) + 'px'; };
  th.onpointerup = async () => {
    if (!drag) return; drag = false;
    if (!done && parseFloat(th.style.left) - 5 > max() * 0.85) { done = true; await reserve(p, q); }
    else th.style.left = '5px';
  };
}

async function reserve(p, q) {
  const { data: o, error } = await sb.rpc('reserve_bag', { p_bag_id: p.id, p_qty: q });
  if (error) { toast(error.message); closeSheet(); return loadBags(); }
  closeSheet();
  await Promise.all([loadBags(), loadMyOrders()]);
  showCode(o, p);
}

// Teslim kodu ekranı
function showCode(o, p) {
  const b = p.businesses, pg = $('#page');
  if (dmap) { dmap.remove(); dmap = null; }
  pg.className = 'page teal'; pg.hidden = false;
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
function renderOrders() {
  $('#orders').innerHTML = !user ? '<button class="btn small" data-in type="button">Giriş yap</button><p class="empty">Siparişlerini görmek için giriş yap.</p>'
    : myOrders.length ? myOrders.map(o => {
      const p = o.bags;
      return `<div class="order" ${o.status === 'teslim' ? '' : `data-oid="${o.id}" style="cursor:pointer"`}><b>${esc(p.businesses.name)}</b>
        <span class="muted">${o.qty}× ${esc(p.title)} · ${money(o.total)} ₺</span>
        <span class="muted">Teslim: ${hm(p.pickup_from)} - ${hm(p.pickup_to)}</span>
        ${o.status === 'teslim' ? '<span class="badge">Teslim alındı</span>' : `<div class="codebox">${esc(o.code)}</div>`}</div>`;
    }).join('') : '<p class="empty">Henüz siparişin yok. Bir paket kurtar!</p>';
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

async function renderBiz() {
  const root = $('#bizRoot');
  if (!user) return root.innerHTML = '<p class="muted">İşletme paneli için giriş yap.</p>';
  if (!myBiz) {
    root.innerHTML = `<form class="form" id="bizForm"><h3>İşletmeni kaydet</h3>
      <input name="name" required placeholder="İşletme adı" aria-label="İşletme adı">
      <select name="type" aria-label="Tür"><option value="restoran">Restoran / Lokanta</option><option value="kafe">Kafe</option></select>
      <input name="address" placeholder="Adres" aria-label="Adres">
      <p class="muted">Konum: Gözat sekmesinde haritayı mekânının üzerine getir, sonra buraya dönüp kaydet. Harita merkezi kullanılır.</p>
      <button class="btn" type="submit">Kaydet</button></form>`;
    $('#bizForm').onsubmit = async e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target)), c = map.getCenter();
      const { error } = await sb.from('businesses').insert({ owner_id: user.id, name: f.name, type: f.type, address: f.address, lat: c.lat, lng: c.lng });
      if (error) return toast(error.message);
      toast('İşletme kaydedildi'); await loadMyBiz(); loadBags();
    };
    return;
  }
  const [{ data: mine }, { data: ords }] = await Promise.all([
    sb.from('bags').select('*').eq('business_id', myBiz.id).eq('pickup_date', todayTR()),
    sb.from('orders').select('*, bags!inner(title, business_id)').eq('bags.business_id', myBiz.id).order('created_at', { ascending: false }),
  ]);
  root.innerHTML = `<p><b>${esc(myBiz.name)}</b> <span class="muted">· ${esc(myBiz.address)}</span></p>
    <form id="bagForm" class="form"><h3>Yeni sürpriz paket</h3>
      <input name="title" required placeholder="Paket adı (örn. Akşam Yemeği Paketi)" aria-label="Paket adı">
      <input name="desc" placeholder="Kısa açıklama / alerjen bilgisi" aria-label="Açıklama">
      <div class="row2"><input name="orig" type="number" min="1" required placeholder="Normal ₺" aria-label="Normal fiyat"><input name="price" type="number" min="1" required placeholder="İndirimli ₺" aria-label="İndirimli fiyat"></div>
      <div class="row2"><input name="qty" type="number" min="1" max="50" required placeholder="Adet" aria-label="Adet"><input name="from" type="time" required value="21:00" aria-label="Başlangıç"><input name="to" type="time" required value="22:00" aria-label="Bitiş"></div>
      <label class="f">Paket fotoğrafı (isteğe bağlı)<input name="photo" type="file" accept="image/jpeg,image/png,image/webp"></label>
      <button class="btn" type="submit">Yayınla</button></form>
    <h3 class="sub">Bugünkü paketler</h3>
    ${(mine || []).map(p => `<div class="order"><b>${esc(p.title)}</b>
      <span class="muted">${money(p.price)} ₺ (normal ${money(p.original_price)} ₺) · ${hm(p.pickup_from)} - ${hm(p.pickup_to)} · ${p.qty_available} adet kaldı</span>
      <div><button class="btn small sec" data-del="${p.id}" type="button">Kaldır</button></div></div>`).join('') || '<p class="muted">Aktif paket yok.</p>'}
    <h3 class="sub">Siparişler</h3>
    ${(ords || []).map(o => `<div class="order"><b>${o.qty}× ${esc(o.bags.title)}</b>
      ${o.status === 'teslim' ? '<span class="badge">Teslim edildi</span>' :
        `<div class="row2"><input data-code="${o.id}" placeholder="Müşteri kodu" inputmode="numeric" maxlength="4" aria-label="Müşteri kodu" style="min-height:44px;border:2px solid var(--line);border-radius:12px;padding:0 12px;width:100%"><button class="btn small" data-ok="${o.id}" type="button">Onayla</button></div>`}</div>`).join('') || '<p class="muted">Henüz sipariş yok.</p>'}`;
  $('#bagForm').onsubmit = async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    if (+f.price >= +f.orig) return toast('İndirimli fiyat normalden düşük olmalı');
    let photo_url = null;
    if (f.photo && f.photo.size) {
      try { photo_url = await uploadPhoto(f.photo, myBiz.id); } catch { return toast('Fotoğraf yüklenemedi'); }
    }
    const { error } = await sb.from('bags').insert({ business_id: myBiz.id, title: f.title, description: f.desc, original_price: +f.orig, price: +f.price, qty_available: +f.qty, pickup_from: f.from, pickup_to: f.to, photo_url });
    if (error) return toast(error.message);
    toast('Paket yayınlandı'); renderBiz(); loadBags();
  };
}

// ---------- Gezinme ve olaylar ----------
function setTab(name) {
  document.querySelectorAll('.tabbar button').forEach(x => x.classList.toggle('on', x.dataset.t === name));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + name));
  closePage();
  if (name === 'gozat') setTimeout(() => { map.invalidateSize(); map.setView(me, 14); }, 50);
}
document.querySelectorAll('.tabbar button').forEach(btn => btn.onclick = () => setTab(btn.dataset.t));
$('#toList').onclick = () => setTab('kesfet');
$('#locBtn').onclick = locSheet;
$('#q').oninput = e => { query = e.target.value; render(); };
$('#cats').onclick = e => {
  const b = e.target.closest('button[data-c]'); if (!b) return; cat = b.dataset.c;
  document.querySelectorAll('#cats button').forEach(x => x.classList.toggle('on', x === b)); render();
};
document.addEventListener('click', async e => {
  const t = e.target;
  if (t.closest('[data-in]')) return authSheet();
  if (t.matches('[data-out]')) { e.preventDefault(); return sb.auth.signOut(); }
  const loc = t.closest('[data-loc]');
  if (loc) { if (loc.dataset.loc === 'preset') { setLocation(DEFAULT_LOC, 'Kadıköy', 'preset'); closeSheet(); } else useCurrentLocation(); return; }
  if (t.closest('[data-soon]')) return toast('Kayıtlı konumlar yakında');
  const all = t.closest('[data-all]');
  if (all) return showList(all.dataset.all);
  const fav = t.closest('[data-fav]');
  if (fav) { e.stopPropagation(); return toggleFav(fav.dataset.fav); }
  const c = t.closest('.card[data-id]');
  if (c) return openBag(c.dataset.id);
  const od = t.closest('.order[data-oid]');
  if (od) { const o = myOrders.find(x => x.id === od.dataset.oid); if (o) showCode(o, o.bags); }
});
$('#tab-profil').addEventListener('click', async e => {
  const del = e.target.dataset.del, ok = e.target.dataset.ok;
  if (del) {
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
