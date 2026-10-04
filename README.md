# Kırıntı

Restoran ve kafelerde kapanıştan önce artan yemekleri uygun fiyata harita üzerinden satan platform (Türkiye).

- `index.html` – tanıtım sitesi (erken erişim + işletme başvurusu)
- `app/` – uygulama prototipi (harita, rezervasyon, işletme paneli). Veriler şimdilik `localStorage`, ödeme sahte.

Yerelde çalıştırma: `python3 -m http.server 8765` ardından http://localhost:8765

## Yol haritası
1. Supabase ile gerçek veritabanı ve giriş
2. PWA
3. Ödeme (iyzico / PayTR)
4. Capacitor ile iOS/Android
