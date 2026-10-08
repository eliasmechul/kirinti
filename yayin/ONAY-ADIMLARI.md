# Kırıntı yayın onayı (3 dakika)

Hazır paket: `yayin/kirinti-netlify.zip` (63 dosya, site + uygulama, TR/EN, güncel).

## A) En hızlı yol: sürükle-bırak (ağ izni gerekmez)
1. https://app.netlify.com/projects/kirinti-app/deploys adresini aç.
2. Sayfanın altındaki "Drag and drop your site output folder here" alanına `dist` klasörünü
   (veya zip'i açıp içindekileri) sürükle.
3. 30 saniye sonra site https://kirinti-app.netlify.app adresinde yayında.

## B) Otomatik (her push yayınlanır)
Netlify → Add new project → Import from GitHub → eliasmechul/kirinti → branch `claude/vibrant-turing-mz2jcl`
(build: `sh build.sh`, publish: `dist` — netlify.toml'da zaten ayarlı).

## Yayından sonra yapılacaklar
1. Netlify → Site configuration → Access control: "SSO team login"i kapat (herkes görebilsin).
2. Supabase → Authentication → URL Configuration: Site URL = https://kirinti-app.netlify.app
   (alan adı bağlanınca https://kirinti-app.com).
3. Alan adı: kirinti-app.com'u satın al → Netlify → Domain management → Add custom domain.
4. Gerçek ödeme: iyzico/PayPal hesabı. Bağış: yetkili yardım kuruluşu + yasal izin.
