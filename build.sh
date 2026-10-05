#!/bin/sh
# Yayın klasörünü (dist/) hazırlar: yalnızca sitenin ve uygulamanın ihtiyaç duyduğu dosyalar.
set -e
cd "$(dirname "$0")"
rm -rf dist && mkdir -p dist
cp index.html styles.css script.js dist/
cp -R app assets dist/
rm -f dist/assets/photos/CREDITS.md
cp assets/photos/CREDITS.md dist/assets/CREDITS.md
echo "dist/ hazır: $(du -sh dist | cut -f1)"
