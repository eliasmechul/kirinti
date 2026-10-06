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
index.html, styles.css, script.js   tanıtım sitesi (yeni tasarım)
app/                                uygulama (Supabase'e bağlı, yeni tasarım)
assets/logo/                        logo (SVG): işaret, yatay logo, uygulama simgesi, favicon
assets/photos/                      stok fotoğraflar + CREDITS.md
design/                             tuvaldeki tasarımın kaynak dosyaları (YENİ hedef)
design/preview/index.html           tasarımları çift tıklayıp tarayıcıda görmek için
supabase/README.md                  veritabanı notları
```

## Tasarım yönü (karar verildi)
Too Good To Go'nun sitesi ve uygulaması incelendi; **düzen ve akış** oradan, marka öğeleri bizim.
- Tam ekran koyu yeşil giriş, dar ve kalın büyük harfli başlık, yiyecek isimleri şeridi, "1. Adım" bölümü, ince çerçeveli işletme kartları.
- Uygulama (Too Good To Go'nun gerçek uygulama videosu incelenerek yeniden yapıldı): üstte konum rozeti ve alt panel (seçili / şu anki konum, ev, iş), yuvarlak kategori görselleri, "Tümünü gör" bağlantılı yatay bölümler (Çevrendeki favoriler, Kaçmadan kurtar, Yeni paketler…), kartlarda fotoğraf + adet rozeti + mekân logosu + başlığın yanında kalp, fotoğraflı detay sayfası (kaydırınca üst çubuk, adres, "Bu paket hakkında", yol tarifi haritası, teslim bilgisi, ambalaj, alerjenler), altta fiyat + adet + "Rezerve et", kaydırarak onay, teslim kodu ekranı. Alt menü: Keşfet / Gözat / Siparişler / Favoriler / Profil. Puan/yorum henüz yok (veri yok).
- Renkler (adaçayı yeşili + hardal sarısı): adaçayı `#BDD16B` (üst alan, bölümler, teslim kodu ekranı), hardal `#FFC93C` (düğmeler, vurgu; üstünde koyu yazı), koyu zeytin `#4C6A1E` (metin/ikon vurgusu), mürekkep `#2B2E1A`, açık yüzeyler `#F6FAE8` / `#E8F0C8`. Site, uygulama, logo ve illüstrasyonlar aynı paletle.
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
1. Uygulamada giriş → rezervasyon → teslim kodu akışını gerçek bir hesapla uçtan uca denemek (ana ekran, detay, harita, konum paneli tarayıcıda görüldü; giriş ve rezervasyon denenmedi).
2. Siteyi internete açmak (Netlify veya Vercel) ve fotoğraf yollarını buna göre ayarlamak.
3. ~~PWA~~ yapıldı (manifest, servis çalışanı, simgeler). Sıradaki: Capacitor ile App Store / Google Play. Not: uygulama dosyalarını değiştirince `app/sw.js` içindeki `CACHE` sürümünü artır.
4. Komisyon alanları (`commission_rate`, `commission_amount`, `payout_amount`, ödeme durumu) ve iade akışı.
5. Puan/yorum, bildirimler, favorileri veritabanına taşımak.
6. KVKK aydınlatma metni, kullanım koşulları, mesafeli satış sözleşmesi.

## Çalışma notları
- Yerelde çalıştırma: klasörde `python3 -m http.server 8766`, sonra `http://localhost:8766` (site) ve `/app/index.html` (uygulama).
- Claude'un önizleme sunucusu `~/Documents` klasörünü okuyamıyor (korumalı çalışıyor); önizleme için projenin kopyası geçici klasöre alınır. Kendi tarayıcında `python3 -m http.server 8766` ile sorunsuz çalışır.
- Fotoğrafların kaynağı ve lisansı: `assets/photos/CREDITS.md`.
- Tüm commit'lerde Claude ortak yazar olarak belirtilir.

## Uygulama iyileştirmeleri (2026-10-06)
- Keşfet'te arama kutusu (Gözat'taki ile bağlı), %indirim rozeti, "Şimdi teslim alınabilir" etiketi, metre/km gösterimi, yükleniyor iskeleti ve hata durumunda "Tekrar dene".
- Favori kalbi artık listeyi yeniden çizmez (kaydırma yerinde kalır); arama 160 ms beklemeyle çalışır; mesafe önbelleğe alınır.
- Harita kütüphanesi (Leaflet) yalnızca Gözat veya detay haritası gerektiğinde yüklenir; açılış hızlandı.
- Giriş yapınca yarım kalan rezervasyon devam eder; "Şifremi unuttum"; kaydırarak onay klavye ile de yapılabilir; çift gönderim engellendi.
- Telefonun geri tuşu ve Esc, sayfa/panelleri uygulamadan çıkmadan kapatır.
- Kayıtlı konumlar (Ev / İş / Başka) bu cihazda saklanır. İşletme kaydında "Konumumu kullan" (harita merkezi yerine).
- Siparişler Aktif / Geçmiş olarak ayrıldı; profil kartı; işletme paneli açılır bölüm.
- Paketler arka plandan dönünce ve 2 dakikada bir yenilenir.
- PWA: `manifest.webmanifest`, `sw.js`, `icons/`.

