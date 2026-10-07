#!/bin/sh
# Bulunan Unsplash fotoğraflarını assets/photos/ içine doğru adlarla indirir.
# Kendi bilgisayarında, proje klasöründe çalıştır:  sh scripts/foto-indir.sh
# Unsplash Lisansı: ticari kullanım dahil ücretsiz. İndirdikten sonra fotoğrafçıları assets/photos/CREDITS.md dosyasına ekle.
set -e
cd "$(dirname "$0")/.."
indir() {  # ad  unsplash-foto-kimliği
  echo "→ $1.jpg"
  curl -fL --retry 2 -o "assets/photos/$1.jpg" "https://unsplash.com/photos/$2/download?force=true&w=1400"
}
indir vegetables XPltBlxfChk      # kasada taze sebzeler
indir fruit      HuzUjfAn4A4      # meyve sepetleri
indir bread      bph0kUmAoXc      # baget ekmek
indir ready      T_nI-UhMm5g      # tavuk, pilav ve sebze
echo "Bitti. Dosyaları kontrol et, sonra 'sh build.sh' ile yayın paketini yenile."
