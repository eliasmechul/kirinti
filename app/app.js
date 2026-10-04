// PROTOTİP: veriler tarayıcıda (localStorage) tutulur, ödeme sahtedir.
// Gerçek sürümde bunların hepsi sunucu + ödeme altyapısı (iyzico/PayTR) olacak.
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const BIZ = [
  { id: 'b1', name: 'Moda Kafe',          type: 'kafe',     lat: 40.9877, lng: 29.0254, addr: 'Moda Cd., Kadıköy' },
  { id: 'b2', name: 'Köşe Lokantası',     type: 'restoran', lat: 40.9921, lng: 29.0273, addr: 'Güneşli Bahçe Sk., Kadıköy' },
  { id: 'b3', name: 'Barış Pide Salonu',  type: 'restoran', lat: 40.9902, lng: 29.0351, addr: 'Bahariye Cd., Kadıköy' },
  { id: 'b4', name: 'Fenerbahçe Brunch',  type: 'kafe',     lat: 40.9803, lng: 29.0396, addr: 'Fener Kalamış Cd.' },
  { id: 'b5', name: 'Ada Meyhanesi',      type: 'restoran', lat: 40.9969, lng: 29.0222, addr: 'Kadıköy Çarşı' },
];
const nowStr = () => new Date().toTimeString().slice(0, 5);
const SEED = [
  { id: 'p1', biz: 'b1', title: 'Pasta & Kurabiye Paketi', desc: 'Günün pastaları, kurabiyeler. Gluten, süt içerir.', orig: 180, price: 60, qty: 4, from: '20:00', to: '22:00' },
  { id: 'p2', biz: 'b2', title: 'Akşam Yemeği Paketi', desc: 'Ana yemek + pilav + çorba. Et içerebilir.', orig: 320, price: 110, qty: 3, from: '21:30', to: '22:30' },
  { id: 'p3', biz: 'b3', title: 'Pide & Lahmacun Paketi', desc: 'Gün sonu pideleri. Gluten içerir.', orig: 280, price: 95, qty: 5, from: '22:00', to: '23:00' },
  { id: 'p4', biz: 'b4', title: 'Brunch Sürpriz Kutusu', desc: 'Sandviç, börek, salata. Vejetaryen seçenek olabilir.', orig: 240, price: 80, qty: 0, from: '17:00', to: '18:00' },
  { id: 'p5', biz: 'b5', title: 'Meze Tabağı Paketi', desc: 'Soğuk mezeler. Deniz ürünü içerebilir.', orig: 300, price: 100, qty: 2, from: '23:00', to: '23:59' },
];

const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
let bags = load('kirinti_bags', SEED);
let orders = load('kirinti_orders', []);
let filter = 'hepsi', view = 'map';
let me = [40.9908, 29.0290];
const bizOf = id => BIZ.find(b => b.id === id);
const persist = () => { save('kirinti_bags', bags); save('kirinti_orders', orders); };

const km = ([a, b], [c, d]) => {
  const r = x => x * Math.PI / 180, h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
const isOpen = p => nowStr() >= p.from && nowStr() <= p.to;
const toast = t => { const el = $('#toast'); el.textContent = t; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2200); };

// ---------- Harita ----------
const map = L.map('map', { zoomControl: false }).setView(me, 14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
L.circleMarker(me, { radius: 8, color: '#fff', weight: 3, fillColor: '#2f7cff', fillOpacity: 1 }).addTo(map);
const layer = L.layerGroup().addTo(map);
if (navigator.geolocation) navigator.geolocation.getCurrentPosition(p => {
  me = [p.coords.latitude, p.coords.longitude]; map.setView(me, 14); $('#locName').textContent = 'Konumun'; render();
}, () => {}, { timeout: 4000 });

function visible() {
  return bags.filter(p => {
    const b = bizOf(p.biz);
    if (filter === 'restoran' || filter === 'kafe') return b.type === filter;
    if (filter === 'simdi') return isOpen(p) && p.qty > 0;
    return true;
  }).sort((a, b) => km(me, [bizOf(a.biz).lat, bizOf(a.biz).lng]) - km(me, [bizOf(b.biz).lat, bizOf(b.biz).lng]));
}

function render() {
  const list = visible();
  layer.clearLayers();
  list.forEach(p => {
    const b = bizOf(p.biz);
    const icon = L.divIcon({ className: '', iconSize: [38, 38], iconAnchor: [19, 38],
      html: `<div class="pin ${b.type} ${p.qty ? '' : 'out'}" style="width:38px;height:38px"><span>${p.qty}</span></div>` });
    L.marker([b.lat, b.lng], { icon }).addTo(layer).on('click', () => openBag(p.id));
  });
  $('#list').innerHTML = list.length ? list.map(p => {
    const b = bizOf(p.biz);
    return `<div class="item ${b.type}" data-id="${p.id}">
      <span class="badge ${p.qty ? '' : 'out'}">${p.qty ? p.qty + ' paket kaldı' : 'Tükendi'}</span>
      <b>${esc(b.name)}</b><span>${esc(p.title)}</span>
      <div class="pr"><strong>${p.price} ₺</strong><s>${p.orig} ₺</s></div>
      <small>Bugün ${p.from}–${p.to} · ${km(me, [b.lat, b.lng]).toFixed(1)} km</small></div>`;
  }).join('') : '<p class="muted">Bu filtrede paket yok.</p>';
  renderOrders(); renderBiz();
}

// ---------- Paket detay / rezervasyon ----------
function sheet(html) { $('#sheetBody').innerHTML = html; $('#sheet').hidden = false; }
const closeSheet = () => { $('#sheet').hidden = true; };

function openBag(id) {
  const p = bags.find(x => x.id === id), b = bizOf(p.biz);
  let q = 1;
  const draw = () => {
    sheet(`<span class="badge ${p.qty ? '' : 'out'}">${p.qty ? p.qty + ' paket kaldı' : 'Tükendi'}</span>
      <h3>${esc(b.name)}</h3><p class="muted">${b.type === 'kafe' ? '☕ Kafe' : '🍽️ Restoran'} · ${esc(b.addr)}</p>
      <b>${esc(p.title)}</b><p class="muted">${esc(p.desc)}</p>
      <p>⏰ Teslim: <b>Bugün ${p.from}–${p.to}</b></p>
      <p><b style="color:var(--tomato);font-size:1.4rem">${p.price} ₺</b> <s class="muted">${p.orig} ₺</s></p>
      ${p.qty ? `<div class="qty"><button id="m">−</button><span>${q}</span><button id="pl">+</button></div>
      <button class="btn" id="buy">${p.price * q} ₺ öde ve ayır</button>` : ''}
      <p class="muted">Paketin içeriği sürprizdir. Ödeme prototipte simüle edilir.</p>
      <button class="btn sec" id="x">Kapat</button>`);
    $('#x').onclick = closeSheet;
    if (p.qty) {
      $('#m').onclick = () => { q = Math.max(1, q - 1); draw(); };
      $('#pl').onclick = () => { q = Math.min(p.qty, 3, q + 1); draw(); };
      $('#buy').onclick = () => reserve(p, q);
    }
  };
  draw();
}

function reserve(p, q) {
  if (p.qty < q) return toast('Yeterli paket kalmadı');
  p.qty -= q;
  const o = { id: 'o' + Date.now(), bag: p.id, qty: q, code: String(Math.floor(1000 + Math.random() * 9000)), status: 'bekliyor', at: Date.now() };
  orders.unshift(o); persist(); render();
  const b = bizOf(p.biz);
  sheet(`<h3>🎉 Paketin ayrıldı!</h3><p class="muted">${esc(b.name)} · Bugün ${p.from}–${p.to}</p>
    <p>Teslim alırken bu kodu göster:</p><div class="code">${o.code}</div>
    <button class="btn" id="x">Tamam</button>`);
  $('#x').onclick = closeSheet;
}

// ---------- Siparişlerim ----------
function renderOrders() {
  $('#orders').innerHTML = orders.length ? orders.map(o => {
    const p = bags.find(x => x.id === o.bag), b = bizOf(p.biz);
    return `<div class="order"><b>${esc(b.name)}</b><span class="muted">${o.qty}× ${esc(p.title)} · ${p.price * o.qty} ₺</span>
      <span class="muted">Bugün ${p.from}–${p.to}</span>
      ${o.status === 'teslim' ? '<span class="badge">Teslim alındı ✓</span>' : `<div class="code">${o.code}</div>`}</div>`;
  }).join('') : '<p class="muted">Henüz siparişin yok. Haritadan bir paket kurtar!</p>';
}

// ---------- İşletme paneli ----------
let myBiz = load('kirinti_mybiz', 'b1');
$('#bizSel').innerHTML = BIZ.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join('');
$('#bizSel').value = myBiz;
$('#bizSel').onchange = e => { myBiz = e.target.value; save('kirinti_mybiz', myBiz); renderBiz(); };

function renderBiz() {
  const mine = bags.filter(p => p.biz === myBiz);
  $('#bizBags').innerHTML = mine.map(p => `<div class="order"><b>${esc(p.title)}</b>
    <span class="muted">${p.price} ₺ (normal ${p.orig} ₺) · ${p.from}–${p.to} · ${p.qty} adet kaldı</span>
    <button class="btn small sec" data-del="${p.id}">Kaldır</button></div>`).join('') || '<p class="muted">Aktif paket yok.</p>';
  const mo = orders.filter(o => bags.find(x => x.id === o.bag)?.biz === myBiz);
  $('#bizOrders').innerHTML = mo.map(o => {
    const p = bags.find(x => x.id === o.bag);
    return `<div class="order"><b>${o.qty}× ${esc(p.title)}</b>
      ${o.status === 'teslim' ? '<span class="badge">Teslim edildi ✓</span>' :
      `<div class="row"><input data-code="${o.id}" placeholder="Müşteri kodu" inputmode="numeric" maxlength="4"><button class="btn small" data-ok="${o.id}">Onayla</button></div>`}</div>`;
  }).join('') || '<p class="muted">Henüz sipariş yok.</p>';
}

$('#bagForm').onsubmit = e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const price = +f.price, orig = +f.orig;
  if (price >= orig) return toast('İndirimli fiyat normalden düşük olmalı');
  bags.push({ id: 'p' + Date.now(), biz: myBiz, title: f.title, desc: f.desc, orig, price, qty: +f.qty, from: f.from, to: f.to });
  persist(); render(); e.target.reset(); toast('Paket yayınlandı 🎉');
};
$('#tab-isletme').addEventListener('click', e => {
  const del = e.target.dataset.del, ok = e.target.dataset.ok;
  if (del) { bags = bags.filter(p => p.id !== del); persist(); render(); }
  if (ok) {
    const o = orders.find(x => x.id === ok), inp = document.querySelector(`[data-code="${ok}"]`);
    if (inp.value.trim() === o.code) { o.status = 'teslim'; persist(); render(); toast('Teslim onaylandı ✓'); }
    else toast('Kod yanlış');
  }
});

// ---------- Gezinme ----------
document.querySelectorAll('.tabbar button').forEach(btn => btn.onclick = () => {
  document.querySelectorAll('.tabbar button').forEach(x => x.classList.toggle('on', x === btn));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + btn.dataset.t));
  if (btn.dataset.t === 'kesfet') setTimeout(() => map.invalidateSize(), 50);
});
$('#chips').onclick = e => { const f = e.target.dataset.f; if (!f) return; filter = f;
  document.querySelectorAll('#chips button').forEach(x => x.classList.toggle('on', x.dataset.f === f)); render(); };
$('#viewSeg').onclick = e => { const v = e.target.dataset.v; if (!v) return; view = v;
  document.querySelectorAll('#viewSeg button').forEach(x => x.classList.toggle('on', x.dataset.v === v));
  $('#list').hidden = v !== 'list'; setTimeout(() => map.invalidateSize(), 50); };
$('#list').onclick = e => { const it = e.target.closest('.item'); if (it) openBag(it.dataset.id); };
$('.sheet-bg').onclick = closeSheet;

render();
