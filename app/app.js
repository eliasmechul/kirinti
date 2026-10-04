// Kırıntı uygulaması: Supabase'e bağlı. Ödeme henüz simüle (iyzico/PayTR sonra).
const SUPABASE_URL = 'https://dkcwjgonziqizaouypsd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_U8w5lw--srZQ9auJAeLTIQ_oxR065hS'; // herkese açık anahtar; güvenlik RLS kurallarında
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hm = t => String(t).slice(0, 5);
const todayTR = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
const nowTR = () => new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' });
const money = n => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const toast = t => { const el = $('#toast'); el.textContent = t; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600); };
const km = ([a, b], [c, d]) => {
  const r = x => x * Math.PI / 180, h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
const ICON = {
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  go: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  nav: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l18-8-8 18-2-8z"/></svg>',
};

let user = null, bags = [], myOrders = [], myBiz = null;
let cat = 'hepsi', query = '', me = [40.9908, 29.0290], selId = null;
let favs = [];
try { favs = JSON.parse(localStorage.getItem('kirinti_fav') || '[]'); } catch {}
const saveFavs = () => { try { localStorage.setItem('kirinti_fav', JSON.stringify(favs)); } catch {} };

// ---------- Görsel yardımcılar ----------
const photo = p => esc(p.photo_url || (p.businesses.type === 'kafe' ? '../assets/photos/coffee.jpg' : '../assets/photos/soup.jpg'));
const initial = b => esc(b.name.trim()[0] || '?');
const typeLabel = b => b.type === 'kafe' ? 'Kafe' : 'Restoran';
const dist = p => km(me, [p.businesses.lat, p.businesses.lng]);
const heartBtn = id => `<button class="heart ${favs.includes(id) ? 'on' : ''}" data-fav="${id}" aria-label="Favorilere ekle / çıkar" type="button">${ICON.heart}</button>`;

// ---------- Harita ----------
const map = L.map('map', { zoomControl: false }).setView(me, 14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
const meMarker = L.circleMarker(me, { radius: 8, color: '#fff', weight: 3, fillColor: '#2f7cff', fillOpacity: 1 }).addTo(map);
const layer = L.layerGroup().addTo(map);
function useLocation(quiet) {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(p => {
    me = [p.coords.latitude, p.coords.longitude]; map.setView(me, 14); meMarker.setLatLng(me);
    $('#locName').textContent = 'Konumun'; render();
  }, () => { if (!quiet) toast('Konum izni verilmedi'); }, { timeout: 4000 });
}
useLocation(true);

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
const CATS = {
  pastane: /pasta|kurabiye|börek|tatlı|baklava|simit|poğaça/i,
  kahvalti: /brunch|kahvaltı/i,
};
function visible() {
  const q = query.trim().toLocaleLowerCase('tr');
  return bags.filter(p => {
    const b = p.businesses, text = b.name + ' ' + p.title;
    if (q && !text.toLocaleLowerCase('tr').includes(q)) return false;
    if (cat === 'restoran' || cat === 'kafe') return b.type === cat;
    if (cat === 'pastane' || cat === 'kahvalti') return CATS[cat].test(p.title);
    return true;
  }).sort((a, b) => dist(a) - dist(b));
}

// ---------- Kartlar ----------
function card(p) {
  const b = p.businesses;
  return `<article class="card" data-id="${p.id}">
    <div class="ph"><img class="cover" src="${photo(p)}" alt="${esc(p.title)}" loading="lazy">
      <span class="tagq ${p.qty_available ? '' : 'out'}">${p.qty_available ? p.qty_available + ' kaldı' : 'Tükendi'}</span>
      ${heartBtn(b.id)}<div class="logo-c">${initial(b)}</div></div>
    <div class="body"><div class="nm">${esc(b.name)}</div><div class="ty">${typeLabel(b)} · ${esc(p.title)}</div>
      <div class="row"><span class="when">Bugün ${hm(p.pickup_from)}–${hm(p.pickup_to)} · ${dist(p).toFixed(1)} km</span>
      <span class="price"><s>${money(p.original_price)} ₺</s><b>${money(p.price)} ₺</b></span></div></div></article>`;
}
const rail = (title, sub, list) => list.length ? `<div class="sec-h"><h3>${title}</h3><span>${sub}</span></div><div class="rail">${list.map(card).join('')}</div>` : '';

function render() {
  const list = visible();
  const open = list.filter(p => p.qty_available > 0 && !ended(p));
  const last = [...open].sort((a, b) => hm(a.pickup_to).localeCompare(hm(b.pickup_to))).slice(0, 6);
  $('#sections').innerHTML =
    rail('Son fırsat', 'yakında bitiyor', last)
    + rail('Yakınında', 'en yakından uzağa', open.slice(0, 8))
    + rail('Restoranlar', '', open.filter(p => p.businesses.type === 'restoran'))
    + rail('Kafeler', '', open.filter(p => p.businesses.type === 'kafe'))
    + rail('Tükenenler', 'yarın tekrar bak', list.filter(p => p.qty_available === 0))
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
    L.marker([b.lat, b.lng], { icon }).addTo(layer).on('click', () => { selId = p.id; renderMap(list); renderPick(); });
  });
  renderPick();
}
function renderPick() {
  const p = bags.find(x => x.id === selId);
  $('#pick').innerHTML = p ? `<article class="card" data-id="${p.id}"><div class="ph"><img class="cover" src="${photo(p)}" alt="" loading="lazy"></div>
    <div class="body"><span class="badge">${p.qty_available ? p.qty_available + ' kaldı' : 'Tükendi'}</span>
    <div class="nm" style="margin-top:6px">${esc(p.businesses.name)}</div><div class="ty">${esc(p.title)} · ${dist(p).toFixed(1)} km</div>
    <div class="row"><span class="when">Bugün ${hm(p.pickup_from)}–${hm(p.pickup_to)}</span><span class="price"><s>${money(p.original_price)} ₺</s><b>${money(p.price)} ₺</b></span></div></div></article>` : '';
}
function renderFavs() {
  const list = bags.filter(p => favs.includes(p.businesses.id));
  $('#favs').innerHTML = list.length ? list.map(card).join('') : '<p class="empty">Henüz favorin yok. Kalbe dokunarak mekânları buraya ekle.</p>';
}

// ---------- Sheet / sayfa ----------
function sheet(html) { $('#sheetBody').innerHTML = html; $('#sheet').hidden = false; }
const closeSheet = () => { $('#sheet').hidden = true; };
const closePage = () => { $('#page').hidden = true; };
$('.sheet-bg').onclick = closeSheet;

// ---------- Giriş ----------
function authSheet(msg) {
  sheet(`<h3>Giriş yap / Kayıt ol</h3>${msg ? `<p class="muted">${esc(msg)}</p>` : ''}
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
      ? `<p class="muted">${esc(user.email)} · <a href="#" data-out>Çıkış</a></p>`
      : `<button class="btn small" data-in type="button">Giriş yap / Kayıt ol</button>`;
  });
}
sb.auth.onAuthStateChange((_ev, session) => {
  user = session?.user || null;
  renderAuthBars();
  setTimeout(() => { loadMyOrders(); loadMyBiz(); }, 0);
});
function toggleFav(id) {
  favs = favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id];
  saveFavs(); render();
  const h = $('#page .heart'); if (h && !$('#page').hidden) h.classList.toggle('on', favs.includes(id));
}

// ---------- Paket detay sayfası ----------
function openBag(id) {
  const p = bags.find(x => x.id === id); if (!p) return;
  const b = p.businesses; let q = 1;
  const draw = () => {
    const pg = $('#page'); pg.className = 'page'; pg.hidden = false;
    pg.innerHTML = `<div class="p-hero"><img class="cover" src="${photo(p)}" alt="${esc(p.title)}"><div class="fade"></div>
        <button class="back" id="back" type="button" aria-label="Geri">${ICON.back}</button>${heartBtn(b.id)}
        <div class="p-name"><i>${initial(b)}</i>${esc(b.name)}</div></div>
      <div class="p-body">
        <div class="p-row"><div><div class="t">${typeLabel(b)}</div><div style="font-weight:700;margin-top:4px">${esc(p.title)}</div>
          <div class="t" style="margin-top:6px">${p.qty_available ? p.qty_available + ' paket kaldı' : 'Tükendi'}</div></div>
          <div class="p-price"><s>${money(p.original_price)} ₺</s><b>${money(p.price)} ₺</b></div></div>
        <div class="p-line">${ICON.clock}<span>Teslim: <b>${hm(p.pickup_from)} – ${hm(p.pickup_to)}</b></span><span class="tg">Bugün</span></div>
        <div class="p-line">${ICON.pin}<div><b style="color:var(--teal)">${esc(b.address) || 'Adres bilgisi yok'}</b><div class="sm">${dist(p).toFixed(1)} km uzaklıkta</div></div></div>
        <div class="p-sec"><h4>Neler çıkabilir?</h4><p>${esc(p.description) || 'Mekânın gün sonunda kalan lezzetli ürünleri.'}</p>
          <small>Paketin içeriği sürprizdir. Alerjen durumun varsa paket almadan önce mekânla iletişime geç.</small></div>
      </div>
      <div class="p-cta">${p.qty_available ? `<div class="qty"><button id="m" type="button" aria-label="Azalt">−</button><span>${q}</span><button id="pl" type="button" aria-label="Artır">+</button></div>
        <button class="btn" id="buy" type="button">Ayır · ${money(p.price * q)} ₺</button>` : '<button class="btn" disabled type="button">Tükendi</button>'}</div>`;
    $('#back').onclick = closePage;
    if (p.qty_available) {
      $('#m').onclick = () => { q = Math.max(1, q - 1); draw(); };
      $('#pl').onclick = () => { q = Math.min(p.qty_available, 3, q + 1); draw(); };
      $('#buy').onclick = () => confirmSheet(p, q);
    }
  };
  draw();
}

// Kaydırarak onayla
function confirmSheet(p, q) {
  if (!user) return authSheet('Paket ayırmak için giriş yapmalısın.');
  sheet(`<h3>Siparişi onayla</h3>
    <p><b>${q}× ${esc(p.title)}</b><br><span class="muted">${esc(p.businesses.name)} · Bugün ${hm(p.pickup_from)}–${hm(p.pickup_to)}</span></p>
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
  showCode(o, { ...p, price: p.price });
}

// Teslim kodu ekranı
function showCode(o, p) {
  const b = p.businesses, pg = $('#page');
  const route = `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`;
  pg.className = 'page teal'; pg.hidden = false;
  pg.innerHTML = `<button class="x" id="back" type="button" aria-label="Kapat">${ICON.close}</button>
    <div class="ready"><h2>Paketin hazır</h2><p>${esc(b.name)} · Bugün ${hm(p.pickup_from)}–${hm(p.pickup_to)}</p></div>
    <div class="codecard"><div class="k">Teslim kodu</div><div class="codebox">${esc(o.code)}</div><hr>
      <div class="ln"><span>${o.qty}× ${esc(p.title)}</span><b>${money(o.total)} ₺</b></div>
      <div class="ln" style="margin-top:6px;color:var(--mut);font-size:13px"><span>${esc(b.address) || ''}</span></div></div>
    <a class="route" href="${route}" target="_blank" rel="noopener">${ICON.nav}Yol tarifi al</a>
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
        <span class="muted">Teslim: ${hm(p.pickup_from)}–${hm(p.pickup_to)}</span>
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
      <span class="muted">${money(p.price)} ₺ (normal ${money(p.original_price)} ₺) · ${hm(p.pickup_from)}–${hm(p.pickup_to)} · ${p.qty_available} adet kaldı</span>
      <div><button class="btn small sec" data-del="${p.id}" type="button">Kaldır</button></div></div>`).join('') || '<p class="muted">Aktif paket yok.</p>'}
    <h3 class="sub">Siparişler</h3>
    ${(ords || []).map(o => `<div class="order"><b>${o.qty}× ${esc(o.bags.title)}</b>
      ${o.status === 'teslim' ? '<span class="badge">Teslim edildi</span>' :
        `<div class="row2"><input class="inp" data-code="${o.id}" placeholder="Müşteri kodu" inputmode="numeric" maxlength="4" aria-label="Müşteri kodu" style="min-height:44px;border:2px solid var(--line);border-radius:12px;padding:0 12px;width:100%"><button class="btn small" data-ok="${o.id}" type="button">Onayla</button></div>`}</div>`).join('') || '<p class="muted">Henüz sipariş yok.</p>'}`;
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
$('#locBtn').onclick = () => useLocation(false);
$('#q').oninput = e => { query = e.target.value; render(); };
$('#cats').onclick = e => {
  const b = e.target.closest('button[data-c]'); if (!b) return; cat = b.dataset.c;
  document.querySelectorAll('#cats button').forEach(x => x.classList.toggle('on', x === b)); render();
};
document.addEventListener('click', async e => {
  const t = e.target;
  if (t.closest('[data-in]')) return authSheet();
  if (t.matches('[data-out]')) { e.preventDefault(); return sb.auth.signOut(); }
  const fav = t.closest('[data-fav]');
  if (fav) { e.stopPropagation(); return toggleFav(fav.dataset.fav); }
  const c = t.closest('.card[data-id]');
  if (c) return openBag(c.dataset.id);
  const od = t.closest('.order[data-oid]');
  if (od) { const o = myOrders.find(x => x.id === od.dataset.oid); if (o) showCode(o, { ...o.bags, price: o.bags.price }); }
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
