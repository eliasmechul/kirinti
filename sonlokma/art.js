// Kırıntı illüstrasyonları (özgün, basit düz renkli çizimler). Hem site hem uygulama kullanır.
(function () {
  const S = 'stroke="#2E3047" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
  const wrap = body => `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
  window.ART = {
    soup: wrap(`<path d="M12 54H108A48 42 0 0 1 12 54Z" fill="#F4A28C" ${S}/><ellipse cx="60" cy="54" rx="48" ry="9" fill="#E8892B" ${S}/><ellipse cx="46" cy="53" rx="6" ry="2.5" fill="#6BA364"/><ellipse cx="70" cy="55" rx="7" ry="2.5" fill="#6BA364"/><ellipse cx="58" cy="52" rx="4" ry="1.8" fill="#F7E7B0"/>`),
    banana: wrap(`<path d="M30 20C22 70 52 104 98 86C68 88 48 66 50 20Z" fill="#F2D35B" ${S}/><path d="M30 20L50 20" ${S}/><path d="M92 85L100 87" stroke="#2E3047" stroke-width="5" stroke-linecap="round"/>`),
    pepper: wrap(`<path d="M60 34C30 30 18 60 28 86C36 106 54 104 60 94C66 104 84 106 92 86C102 60 90 30 60 34Z" fill="#E8892B" ${S}/><path d="M60 34C60 24 62 18 70 14" fill="none" ${S}/><path d="M44 36C54 28 66 28 76 36" fill="#6BA364" ${S}/>`),
    jars: wrap(`<rect x="14" y="40" width="40" height="60" rx="8" fill="#F5EBD8" ${S}/><rect x="12" y="30" width="44" height="12" rx="4" fill="#F4A28C" ${S}/><rect x="66" y="52" width="40" height="48" rx="8" fill="#F5EBD8" ${S}/><rect x="64" y="42" width="44" height="12" rx="4" fill="#6BA364" ${S}/><circle cx="26" cy="70" r="6" fill="#fff" ${S}/><circle cx="42" cy="82" r="6" fill="#fff" ${S}/><circle cx="80" cy="76" r="6" fill="#E8892B" ${S}/>`),
    broccoli: wrap(`<path d="M52 108C52 90 50 80 46 70H74C70 80 68 90 68 108Z" fill="#A8C98B" ${S}/><circle cx="36" cy="52" r="18" fill="#6BA364" ${S}/><circle cx="60" cy="38" r="20" fill="#6BA364" ${S}/><circle cx="84" cy="52" r="18" fill="#6BA364" ${S}/><circle cx="60" cy="62" r="16" fill="#6BA364" ${S}/>`),
    croissant: wrap(`<path d="M12 80C14 50 40 30 60 30C80 30 106 50 108 80C96 72 90 72 84 78C76 66 44 66 36 78C30 72 24 72 12 80Z" fill="#E8A860" ${S}/><path d="M44 36L52 66M60 30V64M76 36L68 66" fill="none" ${S}/>`),
    cake: wrap(`<path d="M14 82L60 40L106 82Z" fill="#F7E7B0" ${S}/><path d="M14 82H106V98H14Z" fill="#F4A28C" ${S}/><path d="M32 66L92 66" stroke="#F4A28C" stroke-width="6" stroke-linecap="round"/><circle cx="60" cy="36" r="7" fill="#D6453D" ${S}/>`),
    flatbread: wrap(`<ellipse cx="60" cy="64" rx="50" ry="26" fill="#F0CE90" ${S}/><ellipse cx="60" cy="62" rx="36" ry="16" fill="#E8892B" ${S}/><circle cx="46" cy="60" r="5" fill="#D6453D" ${S}/><circle cx="66" cy="66" r="5" fill="#D6453D" ${S}/><path d="M74 56L86 60M40 70L52 74" stroke="#6BA364" stroke-width="5" stroke-linecap="round"/>`),
    plate: wrap(`<circle cx="60" cy="62" r="48" fill="#fff" ${S}/><circle cx="60" cy="62" r="34" fill="#F5EBD8" ${S}/><circle cx="48" cy="54" r="10" fill="#D6453D" ${S}/><circle cx="72" cy="56" r="10" fill="#6BA364" ${S}/><circle cx="60" cy="76" r="10" fill="#F2D35B" ${S}/>`),
    cup: wrap(`<ellipse cx="58" cy="94" rx="46" ry="10" fill="#fff" ${S}/><path d="M24 40H92V66C92 84 78 92 58 92C38 92 24 84 24 66Z" fill="#F4A28C" ${S}/><path d="M92 48C108 46 108 72 90 72" fill="none" ${S}/><path d="M44 28C40 22 48 18 44 12M62 28C58 22 66 18 62 12" fill="none" ${S}/>`),
    bag: wrap(`<path d="M26 42H94L100 106H20Z" fill="#F5EBD8" ${S}/><path d="M44 42V32C44 14 76 14 76 32V42" fill="none" ${S}/><path d="M60 62C54 56 46 62 52 70L60 78L68 70C74 62 66 56 60 62Z" fill="#E8892B" ${S}/>`),
    phone: wrap(`<rect x="34" y="8" width="52" height="104" rx="10" fill="#fff" ${S}/><rect x="40" y="22" width="40" height="64" rx="4" fill="#C9CBDD"/><circle cx="60" cy="48" r="10" fill="#F4A28C" ${S}/><path d="M52 66H68" ${S}/>`)
  };
  const FOR = p => /pasta|kurabiye|tatlı|baklava|börek/i.test(p.title) ? 'cake'
    : /pide|lahmacun|pizza/i.test(p.title) ? 'flatbread'
    : /meze/i.test(p.title) ? 'plate'
    : /brunch|kahvaltı|sandviç/i.test(p.title) ? 'croissant'
    : p.businesses && p.businesses.type === 'kafe' ? 'cup' : 'soup';
  window.artFor = p => window.ART[FOR(p)];
  // Sitedeki <span data-art="soup"> alanlarını doldur
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-art]').forEach(el => { el.innerHTML = window.ART[el.dataset.art] || ''; });
  });
})();
