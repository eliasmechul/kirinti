// Kırıntı – Supabase'e bağlı sürüm. Ödeme hâlâ simüle (iyzico/PayTR sonra).
const SUPABASE_URL = 'https://dkcwjgonziqizaouypsd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_U8w5lw--srZQ9auJAeLTIQ_oxR065hS'; // herkese açık anahtar; güvenlik RLS kurallarında
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hm = t => String(t).slice(0, 5);
const todayTR = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
const nowTR = () => new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' });
const toast = t => { const el = $('#toast'); el.textContent = t; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600); };
const km = ([a, b], [c, d]) => {
  const r = x => x * Math.PI / 180, h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

let user = null, bags = [], myOrders = [], myBiz = null;
let filter = 'hepsi', query = '', view = 'list', me = [40.9908, 29.0290];
let favs = [];
try { favs = JSON.parse(localStorage.getItem('kirinti_fav') || '[]'); } catch {}
const saveFavs = () => { try { localStorage.setItem('kirinti_fav', JSON.stringify(favs)); } catch {} };

// ---------- Görsel yardımcılar ----------
const hue = s => [...s].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
const PASTEL = ['#C9CBDD', '#F8D5C8', '#CFE0C3', '#F6E6B4'];
const coverStyle = b => `background:${PASTEL[hue(b.name) % PASTEL.length]}`;
const emoji = p => p.photo_url ? `<img class="ph" src="${esc(p.photo_url)}" alt="${esc(p.title)}" loading="lazy">` : artFor(p);
const initial = b => esc(b.name.trim()[0] || '?');

// ---------- Harita ----------
const map = L.map('map', { zoomControl: false }).setView(me, 14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
let meMarker = L.circleMarker(me, { radius: 8, color: '#fff', weight: 3, fillColor: '#2f7cff', fillOpacity: 1 }).addTo(map);
const layer = L.layerGroup().addTo(map);
if (navigator.geolocation) navigator.geolocation.getCurrentPosition(p => {
  me = [p.coords.latitude, p.coords.longitude]; map.setView(me, 14); meMarker.setLatLng(me);
  $('#locName').textContent = 'Konumun'; render();
}, () => {}, { timeout: 4000 });

// ---------- Veri ----------
async function loadBags() {
  const { data, error } = await sb.from('bags').select('*, businesses(*)').eq('pickup_date', todayTR());
  if (error) return toast('Paketler yüklenemedi');
  bags = data; render();
}
async function loadMyOrders() {
  if (!user) { myOrders = []; return renderOrders(); }
  const { data } = await sb.from('orders').select('*, bags(title, pickup_from, pickup_to, price, businesses(name))').eq('customer_id', user.id).order('created_at', { ascending: false });
  myOrders = data || []; renderOrders();
}
async function loadMyBiz() {
  if (!user) { myBiz = null; return renderBiz(); }
  const { data } = await sb.from('businesses').select('*').eq('owner_id', user.id).limit(1);
  myBiz = data?.[0] || null; renderBiz();
}

const isOpen = p => nowTR() >= hm(p.pickup_from) && nowTR() <= hm(p.pickup_to);
const ended = p => nowTR() > hm(p.pickup_to);
const dist = p => km(me, [p.businesses.lat, p.businesses.lng]);
function visible() {
  const q = query.trim().toLocaleLowerCase('tr');
  return bags.filter(p => {
    const t = p.businesses.type;
    if (q && !(p.businesses.name + ' ' + p.title).toLocaleLowerCase('tr').includes(q)) return false;
    if (filter === 'restoran' || filter === 'kafe') return t === filter;
    if (filter === 'simdi') return isOpen(p) && p.qty_available > 0;
    return true;
  }).sort((a, b) => dist(a) - dist(b));
}

// ---------- Kartlar ----------
function card(p) {
  const b = p.businesses, fav = favs.includes(b.id);
  return `<div class="card2" data-id="${p.id}">
    <div class="cover" style="${coverStyle(b)}">${emoji(p)}
      <span class="tagq ${p.qty_available ? '' : 'out'}">${p.qty_available ? p.qty_available + ' kaldı' : 'Tükendi'}</span>
      <button class="heart" data-fav="${b.id}" aria-label="Favori">${fav ? '❤️' : '🤍'}</button>
      <div class="logo-c">${initial(b)}</div></div>
    <div class="body"><b>${esc(b.name)}</b><span class="t">${esc(p.title)}</span>
      <span class="pick">Bugün ${hm(p.pickup_from)}–${hm(p.pickup_to)}</span>
      <div class="row2"><span class="price"><s>${p.original_price} ₺</s>${p.price} ₺</span><span class="dist">${dist(p).toFixed(1)} km</span></div></div></div>`;
}
const rail = (title, sub, list) => list.length ? `<div class="sec-h"><h3>${title}</h3><span>${sub}</span></div><div class="rail">${list.map(card).join('')}</div>` : '';

function render() {
  const list = visible();
  // Ana liste
  const open = list.filter(p => p.qty_available > 0 && !ended(p));
  const lastCall = [...open].sort((a, b) => hm(a.pickup_to).localeCompare(hm(b.pickup_to))).slice(0, 6);
  const html = rail('⏳ Son fırsat', 'yakında bitiyor', lastCall)
    + rail('📍 Yakınında', 'en yakından uzağa', open.slice(0, 8))
    + rail('🍽️ Restoranlar', '', open.filter(p => p.businesses.type === 'restoran'))
    + rail('☕ Kafeler', '', open.filter(p => p.businesses.type === 'kafe'))
    + rail('Tükenenler', 'yarın tekrar bak', list.filter(p => p.qty_available === 0));
  $('#home').innerHTML = html || '<p class="empty">Aramana uygun paket bulunamadı.</p>';
  // Harita
  layer.clearLayers();
  list.forEach(p => {
    const b = p.businesses;
    const icon = L.divIcon({ className: '', iconSize: [38, 38], iconAnchor: [19, 38],
      html: `<div class="pin ${b.type} ${p.qty_available ? '' : 'out'}" style="width:38px;height:38px"><span>${p.qty_available}</span></div>` });
    L.marker([b.lat, b.lng], { icon }).addTo(layer).on('click', () => openBag(p.id));
  });
  renderFavs();
}

function renderFavs() {
  const list = bags.filter(p => favs.includes(p.businesses.id));
  $('#favs').innerHTML = list.length ? list.map(card).join('') : '<p class="empty">Henüz favorin yok. Kalbe dokunarak mekânları buraya ekle.</p>';
}

// ---------- Sheet / sayfa ----------
function sheet(html) { $('#sheetBody').innerHTML = html; $('#sheet').hidden = false; }
const closeSheet = () => { $('#sheet').hidden = true; };
$('.sheet-bg').onclick = closeSheet;
const closePage = () => { $('#page').hidden = true; };

// ---------- Giriş ----------
function authSheet(msg) {
  sheet(`<h3>Giriş yap / Kayıt ol</h3>${msg ? `<p class="muted">${esc(msg)}</p>` : ''}
    <form class="form" id="authForm"><input name="email" type="email" required placeholder="E-posta" autocomplete="email">
    <input name="password" type="password" required minlength="6" placeholder="Şifre (en az 6 karakter)" autocomplete="current-password">
    <button class="btn">Giriş yap</button>
    <button class="btn sec" type="button" id="signup">Kayıt ol</button></form>
    <button class="btn sec" id="x">Kapat</button>`);
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
      : `<button class="btn small" data-in>Giriş yap / Kayıt ol</button>`;
  });
}
document.addEventListener('click', async e => {
  const t = e.target;
  if (t.matches('[data-in]')) authSheet();
  if (t.matches('[data-out]')) { e.preventDefault(); await sb.auth.signOut(); }
  const fav = t.closest('[data-fav]');
  if (fav) { e.stopPropagation(); toggleFav(fav.dataset.fav); }
});
sb.auth.onAuthStateChange((_ev, session) => {
  user = session?.user || null;
  renderAuthBars();
  setTimeout(() => { loadMyOrders(); loadMyBiz(); }, 0);
});
function toggleFav(id) {
  favs = favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id];
  saveFavs(); render();
  const pg = $('#page'); if (!pg.hidden) { const h = pg.querySelector('.heart'); if (h) h.textContent = favs.includes(id) ? '❤️' : '🤍'; }
}

// ---------- Paket detay sayfası ----------
function openBag(id) {
  const p = bags.find(x => x.id === id), b = p.businesses;
  let q = 1;
  const draw = () => {
    const pg = $('#page'); pg.hidden = false;
    pg.innerHTML = `<div class="cover" style="${coverStyle(b)}">${emoji(p)}
        <button class="back" id="back">←</button>
        <button class="heart" data-fav="${b.id}">${favs.includes(b.id) ? '❤️' : '🤍'}</button>
        <div class="logo-c">${initial(b)}</div></div>
      <div class="pbody">
        <h2>${esc(b.name)}</h2>
        <p class="muted">${b.type === 'kafe' ? '☕ Kafe' : '🍽️ Restoran'} · ${esc(b.address)} · ${dist(p).toFixed(1)} km</p>
        <div class="info"><b>${esc(p.title)}</b>
          <div class="pbig">${p.price} ₺<s>${p.original_price} ₺</s></div>
          <span>⏰ Bugün <b>${hm(p.pickup_from)}–${hm(p.pickup_to)}</b> arası teslim</span>
          <span>${p.qty_available ? `🛍️ ${p.qty_available} paket kaldı` : '❌ Tükendi'}</span></div>
        <div class="info"><b>Pakette ne olabilir?</b><span>${esc(p.description) || 'Mekânın gün sonu sürpriz yemekleri.'}</span>
          <span class="muted">Paketin içeriği sürprizdir. Alerjen durumun varsa mekânla paket almadan önce iletişime geç.</span></div>
        <div class="info"><b>Nasıl çalışır?</b><span>1. Ayır ve öde · 2. Teslim saatinde mekâna git · 3. Kodunu göster</span></div>
      </div>
      <div class="cta">${p.qty_available ? `<div class="qty"><button id="m">−</button><span>${q}</span><button id="pl">+</button></div>
        <button class="btn" id="buy">Ayır · ${(p.price * q).toFixed(0)} ₺</button>` : '<button class="btn" disabled>Tükendi</button>'}</div>`;
    $('#back').onclick = closePage;
    if (p.qty_available) {
      $('#m').onclick = () => { q = Math.max(1, q - 1); draw(); };
      $('#pl').onclick = () => { q = Math.min(p.qty_available, 3, q + 1); draw(); };
      $('#buy').onclick = () => confirmSheet(p, q);
    }
  };
  draw();
}

// Kaydırarak onayla (TGTG tarzı)
function confirmSheet(p, q) {
  if (!user) return authSheet('Paket ayırmak için giriş yapmalısın.');
  sheet(`<h3>Siparişi onayla</h3>
    <p><b>${q}× ${esc(p.title)}</b><br><span class="muted">${esc(p.businesses.name)} · Bugün ${hm(p.pickup_from)}–${hm(p.pickup_to)}</span></p>
    <p class="pbig">${(p.price * q).toFixed(0)} ₺</p>
    <p class="muted">Ödeme şimdilik simüle edilir; gerçek kart tahsilatı yapılmaz.</p>
    <div class="swipe" id="sw"><div class="thumb" id="th">➜</div><span>Kaydırarak onayla</span></div>
    <button class="btn sec" id="x">Vazgeç</button>`);
  $('#x').onclick = closeSheet;
  const sw = $('#sw'), th = $('#th');
  let drag = false, x0 = 0, done = false;
  const max = () => sw.clientWidth - th.clientWidth - 8;
  th.onpointerdown = e => { drag = true; x0 = e.clientX; th.setPointerCapture(e.pointerId); };
  th.onpointermove = e => { if (!drag) return; th.style.left = 4 + Math.min(max(), Math.max(0, e.clientX - x0)) + 'px'; };
  th.onpointerup = async () => {
    if (!drag) return; drag = false;
    if (!done && parseFloat(th.style.left) - 4 > max() * 0.85) { done = true; await reserve(p, q); }
    else th.style.left = '4px';
  };
}

async function reserve(p, q) {
  const { data: o, error } = await sb.rpc('reserve_bag', { p_bag_id: p.id, p_qty: q });
  if (error) { toast(error.message); closeSheet(); return loadBags(); }
  await Promise.all([loadBags(), loadMyOrders()]);
  closePage();
  sheet(`<h3>🎉 Paketin ayrıldı!</h3><p class="muted">${esc(p.businesses.name)} · Bugün ${hm(p.pickup_from)}–${hm(p.pickup_to)}</p>
    <p>Teslim alırken bu kodu göster:</p><div class="code">${esc(o.code)}</div>
    <button class="btn" id="x">Tamam</button>`);
  $('#x').onclick = closeSheet;
}

// ---------- Siparişlerim ----------
function renderOrders() {
  $('#orders').innerHTML = !user ? '<button class="btn small" data-in>Giriş yap</button><p class="empty">Siparişlerini görmek için giriş yap.</p>'
    : myOrders.length ? myOrders.map(o => {
      const p = o.bags;
      return `<div class="order"><b>${esc(p.businesses.name)}</b><span class="muted">${o.qty}× ${esc(p.title)} · ${o.total} ₺</span>
        <span class="muted">Teslim: ${hm(p.pickup_from)}–${hm(p.pickup_to)}</span>
        ${o.status === 'teslim' ? '<span class="badge">Teslim alındı ✓</span>' : `<div class="code">${esc(o.code)}</div>`}</div>`;
    }).join('') : '<p class="empty">Henüz siparişin yok. Bir paket kurtar!</p>';
}


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

// ---------- İşletme paneli ----------
async function renderBiz() {
  const root = $('#bizRoot');
  if (!user) return root.innerHTML = '<p class="muted">İşletme paneli için giriş yap.</p>';
  if (!myBiz) {
    root.innerHTML = `<form class="form" id="bizForm"><h3>İşletmeni kaydet</h3>
      <input name="name" required placeholder="İşletme adı">
      <select name="type"><option value="restoran">Restoran / Lokanta</option><option value="kafe">Kafe</option></select>
      <input name="address" placeholder="Adres">
      <p class="muted">Konum: Keşfet'te Harita görünümüne geç, haritayı mekânının üzerine getir, sonra buraya dönüp kaydet.</p>
      <button class="btn">Kaydet</button></form>`;
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
    <form id="bagForm" class="form"><h3>Yeni sürpriz paket ekle</h3>
      <input name="title" required placeholder="Paket adı (örn. Akşam Yemeği Paketi)">
      <input name="desc" placeholder="Kısa açıklama / alerjen bilgisi">
      <div class="row"><input name="orig" type="number" min="1" required placeholder="Normal fiyat ₺"><input name="price" type="number" min="1" required placeholder="İndirimli ₺"></div>
      <div class="row"><input name="qty" type="number" min="1" max="50" required placeholder="Adet"><input name="from" type="time" required value="21:00"><input name="to" type="time" required value="22:00"></div>
      <label class="muted">Paket fotoğrafı (isteğe bağlı)<input name="photo" type="file" accept="image/jpeg,image/png,image/webp"></label>
      <button class="btn">Yayınla</button></form>
    <h3 class="sub">Bugünkü paketler</h3>
    ${(mine || []).map(p => `<div class="order"><b>${esc(p.title)}</b>
      <span class="muted">${p.price} ₺ (normal ${p.original_price} ₺) · ${hm(p.pickup_from)}–${hm(p.pickup_to)} · ${p.qty_available} adet kaldı</span>
      <button class="btn small sec" data-del="${p.id}">Kaldır</button></div>`).join('') || '<p class="muted">Aktif paket yok.</p>'}
    <h3 class="sub">Siparişler</h3>
    ${(ords || []).map(o => `<div class="order"><b>${o.qty}× ${esc(o.bags.title)}</b>
      ${o.status === 'teslim' ? '<span class="badge">Teslim edildi ✓</span>' :
        `<div class="row"><input data-code="${o.id}" placeholder="Müşteri kodu" inputmode="numeric" maxlength="4"><button class="btn small" data-ok="${o.id}">Onayla</button></div>`}</div>`).join('') || '<p class="muted">Henüz sipariş yok.</p>'}`;
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
    toast('Paket yayınlandı 🎉'); renderBiz(); loadBags();
  };
}
$('#tab-hesap').addEventListener('click', async e => {
  const del = e.target.dataset.del, ok = e.target.dataset.ok;
  if (del) {
    const { error } = await sb.from('bags').delete().eq('id', del);
    if (error) toast('Siparişi olan paket silinemez'); else { renderBiz(); loadBags(); }
  }
  if (ok) {
    const code = document.querySelector(`[data-code="${ok}"]`).value.trim();
    const { data, error } = await sb.rpc('complete_order', { p_order_id: ok, p_code: code });
    if (error) return toast(error.message);
    toast(data ? 'Teslim onaylandı ✓' : 'Kod yanlış'); if (data) renderBiz();
  }
});

// ---------- Gezinme ----------
document.querySelectorAll('.tabbar button').forEach(btn => btn.onclick = () => {
  document.querySelectorAll('.tabbar button').forEach(x => x.classList.toggle('on', x === btn));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + btn.dataset.t));
  closePage();
});
$('#chips').onclick = e => { const f = e.target.dataset.f; if (!f) return; filter = f;
  document.querySelectorAll('#chips button').forEach(x => x.classList.toggle('on', x.dataset.f === f)); render(); };
$('#q').oninput = e => { query = e.target.value; render(); };
$('#viewSeg').onclick = e => { const v = e.target.dataset.v; if (!v) return; view = v;
  document.querySelectorAll('#viewSeg button').forEach(x => x.classList.toggle('on', x.dataset.v === v));
  $('#home').hidden = v === 'map'; $('#mapwrap').hidden = v !== 'map';
  if (v === 'map') setTimeout(() => { map.invalidateSize(); map.setView(me, 14); }, 50); };
$('#locBtn').onclick = () => { if (navigator.geolocation) navigator.geolocation.getCurrentPosition(p => {
  me = [p.coords.latitude, p.coords.longitude]; map.setView(me, 14); meMarker.setLatLng(me); $('#locName').textContent = 'Konumun'; render();
}, () => toast('Konum izni verilmedi')); };
document.addEventListener('click', e => {
  const c = e.target.closest('.card2');
  if (c && !e.target.closest('[data-fav]')) openBag(c.dataset.id);
});

renderAuthBars();
loadBags();
