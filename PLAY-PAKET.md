# Kırıntı – Android paketi (TWA) adımları
Uygulama zaten PWA: app/manifest.webmanifest, app/sw.js, 192/512/maskable ikonlar var.
1. Bilgisayarda: npm i -g @bubblewrap/cli
2. bubblewrap init --manifest=https://kirinti-app.com/app/manifest.webmanifest
   (paket adı örn. app.kirintiapp.twa, start URL /app/index.html)
3. bubblewrap build  -> app-release-bundle.aab (Play'e yüklenen dosya)
4. Play Console > Uygulama bütünlüğü > Uygulama imzalama: SHA-256 parmak izini kopyala
5. .well-known/assetlinks.json.ornek dosyasını assetlinks.json olarak yeniden adlandır, parmak izini yaz, siteye yükle (.nojekyll var, nokta klasörü sorun olmaz).
6. Kapalı test -> 12 kişi -> 14 gün.
Not: Play'de mağaza sayfasında ödeme/fiyat vaadi olmasın (ödeme canlı değil, uygulamada sahte ödeme prototipi var).
