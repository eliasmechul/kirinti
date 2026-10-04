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
let filter = 'hepsi', me = [40.9908, 29.0290];

// ---------- Harita ----------
const map = L.map('map', { zoomControl: false }).setView(me, 14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
L.circleMarker(me, { radius: 8, color: '#fff', weight: 3, fillColor: '#2f7cff', fillOpacity: 1 }).addTo(map);
const layer = L.layerGroup().addTo(map);
if (navigator.geolocation) navigator.geolocation.getCurrentPosition(p => {
  me = [p.coords.latitude, p.coords.longitude]; map.setView(me, 14); $('#locName').textContent = 'Konumun'; renderBags();
}, () => {}, { timeout: 4000 });

// ---------- Veri ----------
async function loadBags() {
  const { data, error } = await sb.from('bags').select('*, businesses(*)').eq('pickup_date', todayTR());
  if (error) return toast('Paketler yüklenemedi');
  bags = data; renderBags();
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
function visible() {
  return bags.filter(p => {
    const t = p.businesses.type;
    if (filter === 'restoran' || filter === 'kafe') return t === filter;
    if (filter === 'simdi') return isOpen(p) && p.qty_available > 0;
    return true;
  }).sort((a, b) => km(me, [a.businesses.lat, a.businesses.lng]) - km(me, [b.businesses.lat, b.businesses.lng]));
}

function renderBags() {
  const list = visible();
  layer.clearLayers();
  list.forEach(p => {
    const b = p.businesses;
    const icon = L.divIcon({ className: '', iconSize: [38, 38], iconAnchor: [19, 38],
      html: `<div class="pin ${b.type} ${p.qty_available ? '' : 'out'}" style="width:38px;height:38px"><span>${p.qty_available}</span></div>` });
    L.marker([b.lat, b.lng], { icon }).addTo(layer).on('click', () => openBag(p.id));
  });
  $('#list').innerHTML = list.length ? list.map(p => {
    const b = p.businesses;
    return `<div class="item ${b.type}" data-id="${p.id}">
      <span class="badge ${p.qty_available ? '' : 'out'}">${p.qty_available ? p.qty_available + ' paket kaldı' : 'Tükendi'}</span>
      <b>${esc(b.name)}</b><span>${esc(p.title)}</span>
      <div class="pr"><strong>${p.price} ₺</strong><s>${p.original_price} ₺</s></div>
      <small>Bugün ${hm(p.pickup_from)}–${hm(p.pickup_to)} · ${km(me, [b.lat, b.lng]).toFixed(1)} km</small></div>`;
  }).join('') : '<p class="muted">Bu filtrede paket yok.</p>';
}

// ---------- Sheet ----------
function sheet(html) { $('#sheetBody').innerHTML = html; $('#sheet').hidden = false; }
const closeSheet = () => { $('#sheet').hidden = true; };
$('.sheet-bg').onclick = closeSheet;

// ---------- Giriş ----------
function authSheet(msg) {
  sheet(`<h3>Giriş yap / Kayıt ol</h3>${msg ? `<p class="muted">${esc(msg)}</p>` : ''}
    <form class="form" id="authForm"><input name="email" type="email" required placeholder="E-posta" autocomplete="email">
    <input name="password" type="password" required minlength="6" placeholder="Şifre (en az 6 karakter)" autocomplete="current-password">
    <button class="btn" data-mode="in">Giriş yap</button>
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
    if (!data.session) { toast('Kayıt tamam. E-postanı doğrula.'); } else { closeSheet(); toast('Hoş geldin!'); }
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
  if (e.target.matches('[data-in]')) authSheet();
  if (e.target.matches('[data-out]')) { e.preventDefault(); await sb.auth.signOut(); }
});
sb.auth.onAuthStateChange((_ev, session) => {
  user = session?.user || null;
  renderAuthBars();
  setTimeout(() => { loadMyOrders(); loadMyBiz(); }, 0);
});

// ---------- Paket detay / rezervasyon ----------
function openBag(id) {
  const p = bags.find(x => x.id === id), b = p.businesses;
  let q = 1;
  const draw = () => {
    sheet(`<span class="badge ${p.qty_available ? '' : 'out'}">${p.qty_available ? p.qty_available + ' paket kaldı' : 'Tükendi'}</span>
      <h3>${esc(b.name)}</h3><p class="muted">${b.type === 'kafe' ? '☕ Kafe' : '🍽️ Restoran'} · ${esc(b.address)}</p>
      <b>${esc(p.title)}</b><p class="muted">${esc(p.description)}</p>
      <p>⏰ Teslim: <b>Bugün ${hm(p.pickup_from)}–${hm(p.pickup_to)}</b></p>
      <p><b style="color:var(--tomato);font-size:1.4rem">${p.price} ₺</b> <s class="muted">${p.original_price} ₺</s></p>
      ${p.qty_available ? `<div class="qty"><button id="m">−</button><span>${q}</span><button id="pl">+</button></div>
      <button class="btn" id="buy">${(p.price * q).toFixed(0)} ₺ öde ve ayır</button>` : ''}
      <p class="muted">Paketin içeriği sürprizdir. Ödeme şimdilik simüle edilir.</p>
      <button class="btn sec" id="x">Kapat</button>`);
    $('#x').onclick = closeSheet;
    if (p.qty_available) {
      $('#m').onclick = () => { q = Math.max(1, q - 1); draw(); };
      $('#pl').onclick = () => { q = Math.min(p.qty_available, 3, q + 1); draw(); };
      $('#buy').onclick = () => reserve(p, q);
    }
  };
  draw();
}

async function reserve(p, q) {
  if (!user) return authSheet('Paket ayırmak için giriş yapmalısın.');
  const { data: o, error } = await sb.rpc('reserve_bag', { p_bag_id: p.id, p_qty: q });
  if (error) { toast(error.message); return loadBags(); }
  await Promise.all([loadBags(), loadMyOrders()]);
  sheet(`<h3>🎉 Paketin ayrıldı!</h3><p class="muted">${esc(p.businesses.name)} · Bugün ${hm(p.pickup_from)}–${hm(p.pickup_to)}</p>
    <p>Teslim alırken bu kodu göster:</p><div class="code">${esc(o.code)}</div>
    <button class="btn" id="x">Tamam</button>`);
  $('#x').onclick = closeSheet;
}

// ---------- Siparişlerim ----------
function renderOrders() {
  $('#orders').innerHTML = !user ? '<p class="muted">Siparişlerini görmek için giriş yap.</p>'
    : myOrders.length ? myOrders.map(o => {
      const p = o.bags;
      return `<div class="order"><b>${esc(p.businesses.name)}</b><span class="muted">${o.qty}× ${esc(p.title)} · ${o.total} ₺</span>
        <span class="muted">${hm(p.pickup_from)}–${hm(p.pickup_to)}</span>
        ${o.status === 'teslim' ? '<span class="badge">Teslim alındı ✓</span>' : `<div class="code">${esc(o.code)}</div>`}</div>`;
    }).join('') : '<p class="muted">Henüz siparişin yok. Haritadan bir paket kurtar!</p>';
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
      <p class="muted">Konum: Keşfet haritasını mekânının üzerine getir, sonra kaydet. Harita merkezi kullanılır.</p>
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
    const { error } = await sb.from('bags').insert({ business_id: myBiz.id, title: f.title, description: f.desc, original_price: +f.orig, price: +f.price, qty_available: +f.qty, pickup_from: f.from, pickup_to: f.to });
    if (error) return toast(error.message);
    toast('Paket yayınlandı 🎉'); renderBiz(); loadBags();
  };
}
$('#tab-isletme').addEventListener('click', async e => {
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
  if (btn.dataset.t === 'kesfet') setTimeout(() => map.invalidateSize(), 50);
});
$('#chips').onclick = e => { const f = e.target.dataset.f; if (!f) return; filter = f;
  document.querySelectorAll('#chips button').forEach(x => x.classList.toggle('on', x.dataset.f === f)); renderBags(); };
$('#viewSeg').onclick = e => { const v = e.target.dataset.v; if (!v) return;
  document.querySelectorAll('#viewSeg button').forEach(x => x.classList.toggle('on', x.dataset.v === v));
  $('#list').hidden = v !== 'list'; setTimeout(() => map.invalidateSize(), 50); };
$('#list').onclick = e => { const it = e.target.closest('.item'); if (it) openBag(it.dataset.id); };

renderAuthBars();
loadBags();
