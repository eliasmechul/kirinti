# Devir notu (Kırıntı) — yeni oturum için

Önce bunu, sonra PROJE.md'yi oku. Kullanıcı Türkçe konuşur (İngilizce de yazabilir); kısa ve net cevap ver.

## Ne bu
Kırıntı: Türkiye için Too Good To Go benzeri artan yemek platformu. Site (`index.html`) + PWA uygulama (`app/`) + Supabase (proje `dkcwjgonziqizaouypsd`). Sarı tema, ekmek logosu, TR/EN dil (`assets/i18n.js`), açılış animasyonu, kategori şeridi, ödeme (TEST modu) ve Filistin bağışı.

## Durum
- Kod GitHub'da: eliasmechul/kirinti, dal `claude/vibrant-turing-mz2jcl` (hepsi push'lu). PR açma (istenmedikçe).
- Yayın klasörü: `docs/` (= `dist/` + CNAME `kirinti-app.com` + `.nojekyll`). Yenileme: `sh build.sh && rm -rf docs && cp -r dist docs && touch docs/.nojekyll && printf 'kirinti-app.com\n' > docs/CNAME`.
- Testler (uçtan uca + EN taraması) geçti. Playwright betikleri eski oturumun scratchpad'indeydi, repoda yok.
- Eski `reserve_bag(uuid,int)` için yetkiler kaldırıldı (DROP zaman aşımına uğradı).
- Netlify hesabı kredi limitini aştı → Netlify kullanılmıyor, GitHub Pages hedef.

## Kullanıcı tarafında bekleyenler (ben yapamam)
1. GitHub Pages: Settings → Pages → dal `claude/vibrant-turing-mz2jcl`, klasör `/docs`. (Repo özel ise ücretsiz hesapta Pages için Public gerekir.)
2. `kirinti-app.com` alan adı + DNS: 4 A kaydı (185.199.108-111.153) + `www` CNAME → eliasmechul.github.io; sonra Enforce HTTPS.
3. Supabase → Auth → URL Configuration → Site URL: https://kirinti-app.com
4. Gerçek ödeme (iyzico/PayPal hesabı) ve bağış için yetkili kuruluş + yasal izin (2860 sayılı Kanun).

## Bilinen eksikler
- Sebze/meyve/hazır yemek fotoğrafları çizim (assets/photos/vegetables.jpg, fruit.jpg, ready.jpg yok). Fotoğraf siteleri ağdan engelli; kullanıcı dosyaları yüklerse yerleştir, kaynakları CREDITS.md'ye yaz.
- Ağ ilkesi `kirinti-app.com`, `eliasmechul.github.io`, Unsplash'ı engelliyordu; kullanıcı ortam ağ izni verirse siteyi canlıda kontrol et. `update_environment` ile istek yapılabilir (kullanıcı onaylar).

## Kurallar
- Commit sonuna: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` ve `Claude-Session: <oturum linki>`. Commit/PR'a model adı yazma.
- Sadece `claude/vibrant-turing-mz2jcl` dalına push et.
- Kullanıcı Everygen ile görsel üretmeyi istemedi.
- Hesap/DNS/ödeme gibi kullanıcıya ait işlemleri tahmin etme; şifre/anahtarı sohbete yazdırma.
- Hesabında Kırıntı destek asistanı rutini saatlik çalışıyor (kullanıcı sıklığı azaltmak isteyecek; routines sayfasından kendisi değiştirir).
