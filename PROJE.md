# Kırıntı – Proje dosyası

Son güncelleme: 2026-10-04

## Ne yapıyoruz
Türkiye'de **yalnızca restoran ve kafelerin** kapanıştan önce artan yemeklerini, uygulama üzerinden harita aracılığıyla uygun fiyata "sürpriz paket" olarak sattığı platform (Too Good To Go benzeri). Yerelde doğrudan rakip görünmüyor (Too Good To Go'nun Türkiye sayfası yok; yerel girişimler ayrıca araştırılmalı).

- İsim: **Kırıntı** (geçici karar). `kirinti.com`, `kirinti.app`, `kirintiapp.com` alınmış; `kirinti.com.tr` alınmış ve kullanımda. `kirinti.tr` ve `kirintisofra.com.tr` DNS'te boş görünüyor (nic.tr'den doğrulanmadı).
- Ödeme: online kredi kartı, her satışta komisyon bizde, kalan restorana. **Karar ertelendi** (aşağıya bak).

## Adresler ve hesaplar
| Ne | Nerede |
|---|---|
| Kod | https://github.com/eliasmechul/kirinti (özel) |
| Tasarım tuvali | https://claude.ai/artifact/3S3FgsNK1aAASicnnoRowW |
| Supabase | proje `kirinti`, id `dkcwjgonziqizaouypsd`, bölge eu-central-1 (Frankfurt), ücretsiz plan |
| Yerel klasör | `~/Documents/Kirinti` |

Uygulamadaki anahtar yalnızca "publishable" olandır. `service_role` anahtarını asla koda koyma.

## Klasör yapısı
```
index.html, styles.css, script.js   tanıtım sitesi (ESKİ görünüm, güncellenecek)
art.js                              eski illüstrasyonlar
app/                                uygulama (Supabase'e bağlı, ESKİ görünüm)
assets/photos/                      stok fotoğraflar + CREDITS.md
design/                             tuvaldeki tasarımın kaynak dosyaları (YENİ hedef)
supabase/README.md                  veritabanı notları
```

## Tasarım yönü (karar verildi)
Too Good To Go'nun sitesi ve uygulaması incelendi; **düzen ve akış** oradan, marka öğeleri bizim.
- Tam ekran koyu yeşil giriş, dar ve kalın büyük harfli başlık, yiyecek isimleri şeridi, "1. Adım" bölümü, ince çerçeveli işletme kartları.
- Uygulama: Mevcut konum, yuvarlak kategori fotoğrafları, büyük fotoğraflı kartlar (puan rozeti, mekân logosu, fiyat), tam genişlik detay sayfası, kaydırarak onay, alt menü: Keşfet / Gözat / Favoriler / Siparişler / Profil.
- Renkler: derin yeşil `#0B4F4A`, krem `#F8F2E8`, mercan `#F26B4E`, küçük başlıklarda sarı `#EDE36B`.
- Yazı tipleri: Barlow Condensed (başlık), DM Sans (gövde).
- **Kopyalanmayacaklar:** Too Good To Go'nun logosu, ismi, ikonları, fotoğrafları; paylaşılan infografiğin sanatçısının çizimleri.
- Kullanıcının paylaştığı infografiğin çizim dili (lavanta, şeftali) denendi; kullanıcı "profesyonel durmuyor" dedi, bırakıldı.

## Teknik durum
- **Veritabanı (Supabase):** tablolar `profiles`, `businesses`, `bags`, `orders` (hepsinde RLS açık); fonksiyonlar `reserve_bag` (stok düşer + 4 haneli kod), `complete_order` (mekân sahibi kodu doğrular); `photos` depolama alanı (mekân sahibi kendi klasörüne yükler).
- **Uygulama:** giriş (e-posta/şifre), paket listesi, harita, favoriler (şimdilik tarayıcıda), rezervasyon, siparişlerim, işletme paneli (paket ekle/kaldır, fotoğraf yükle, kodla teslim onayı).
- **Henüz sahte olanlar:** ödeme simüle; 5 örnek Kadıköy mekânı ve stok fotoğraflar (yalnızca demo, sahibi yok); "4,8" gibi puanlar tasarımda var ama veritabanında yok.
- Supabase'de **"Confirm email"** kapatılmadıkça kayıt e-posta doğrulaması ister (denemek için panelden kapatılabilir).
- Örnek paketler kayıt günü tarihiyle eklendi, ertesi gün listeden düşer.

## Karar bekleyenler
1. **Ödeme:** iyzico Pazaryeri veya PayTR Platform ile başvuru. Para dağıtımı için lisanslı kuruluş şart (6493); parayı biz tutmayacağız. Şirket (şahıs/limited), restoran belgeleri (IBAN, vergi levhası), fatura ve KDV için mali müşavir, restoran hizmet sözleşmesi gerekir.
2. **Komisyon oranı:** %30 varsayılan önerildi, restoran bazında ayarlanabilir olacak. Kesinleşmedi.
3. **Alan adı:** `kirinti.tr` / `.com.tr` müsaitliği nic.tr'den kontrol edilecek.
4. **Marka:** TÜRKPATENT ön sorgusu (sınıf 9, 35, 43), Instagram ve mağaza adı kontrolü.

## Sıradaki işler
1. Tuvaldeki yeni tasarımı gerçek **siteye** ve **uygulamaya** aktarmak (şu an kod eski görünümde).
2. Siteyi internete açmak (Netlify veya Vercel) ve fotoğraf yollarını buna göre ayarlamak.
3. PWA (telefonda uygulama gibi açılsın), sonra Capacitor ile App Store / Google Play.
4. Komisyon alanları (`commission_rate`, `commission_amount`, `payout_amount`, ödeme durumu) ve iade akışı.
5. Puan/yorum, bildirimler, favorileri veritabanına taşımak.
6. KVKK aydınlatma metni, kullanım koşulları, mesafeli satış sözleşmesi.

## Çalışma notları
- Yerelde çalıştırma: klasörde `python3 -m http.server 8766`, sonra `http://localhost:8766` (site) ve `/app/index.html` (uygulama).
- Fotoğrafların kaynağı ve lisansı: `assets/photos/CREDITS.md`.
- Tüm commit'lerde Claude ortak yazar olarak belirtilir.
