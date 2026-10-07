#!/bin/sh
# Yayın klasörünü (dist/) hazırlar: yalnızca sitenin ve uygulamanın ihtiyaç duyduğu dosyalar.
set -e
cd "$(dirname "$0")"
rm -rf dist && mkdir -p dist
cp index.html styles.css script.js dist/
cp -R app assets dist/
rm -f dist/assets/photos/CREDITS.md
cp assets/photos/CREDITS.md dist/assets/CREDITS.md
cp supabase/_headers dist/_headers 2>/dev/null || true
echo "dist/ hazır: $(du -sh dist | cut -f1)"
