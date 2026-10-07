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
- Renkler (adaçayı yeşili + hardal sarısı): adaçayı `#FFD45E` (üst alan, bölümler, teslim kodu ekranı), hardal `#FFC93C` (düğmeler, vurgu; üstünde koyu yazı), koyu zeytin `#8A5A00` (metin/ikon vurgusu), mürekkep `#2A2410`, açık yüzeyler `#FFFBEB` / `#FFF1C4`. Site, uygulama, logo ve illüstrasyonlar aynı paletle.
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

## Platform v2 (2026-10-07)
Veritabanı canlıya uygulandı (bkz. `supabase/README.md`). Uygulamada: sipariş iptali (teslim penceresinden önce), gelmeyen siparişin otomatik kapanması, teslim sonrası puan + yorum (kartlarda ★ ortalama, detayda son yorumlar), favorilerin hesapla eşitlenmesi, işletme için tekrarlayan paketler (her gün / hafta içi / hafta sonu), işletme istatistikleri, müşteri "etki" kartı (kurtarılan öğün, tasarruf, CO₂).
**Hâlâ eksik (karar/hesap gerektirir):** gerçek ödeme ve iade (iyzico/PayTR), push/e-posta bildirimleri, işletme onay (admin) akışı, App Store / Google Play paketi (Capacitor + geliştirici hesapları), yayın (hosting + alan adı).

## Daha fazla paket türü (2026-10-07)
İşletme türleri genişledi: `restoran`, `kafe`, `firin`, `manav`, `market` (migration `20261007_business_types.sql`, canlıya uygulandı). Uygulamada yeni kategoriler: Ekmek, Sebze & meyve, Hazır yemek; paket fotoğrafı yoksa türüne/adına göre varsayılan görsel seçilir. Sebze, meyve, ekmek ve hazır yemek görselleri şimdilik çizim (`assets/visuals/`); gerçek fotoğraflarla değiştirilmeli.

## Gözat: arama, filtre ve harita (2026-10-07)
Too Good To Go'nun Gözat sekmesi örnek alındı: arama kutusu + filtre düğmesi (aktif filtre sayısı rozeti) + Harita/Liste anahtarı. Harita artık fiyat değil **mekân işaretleri** gösterir (baş harf + kalan paket sayısı); işarete dokununca altta mekânın paketleri listelenir. Keşfet'teki arama kutusu Gözat'ın liste görünümünü açar. Filtre paneli: sıralama (mesafe, fiyat, puan, bitiş saati), teslim saati (şimdi, sabah, öğle, akşam, gece), kategori (çoklu seçim), mesafe, en yüksek fiyat, tükenenleri gizle; sonuç sayısı canlı güncellenir, seçimler cihazda saklanır.

## Canlıya alma (2026-10-07)
- Canlı veritabanında 8 demo mekân için günlük şablon var; paketler her gün 00:05'te (TR) otomatik yayınlanır, `supabase/seed_demo.sql`. Süresi geçen siparişler 15 dakikada bir `gelmedi` olur.
- Yayın paketi: `sh build.sh` → `dist/` (içinde `_headers`); zip: `kirinti-yayin.zip`. Netlify Drop (app.netlify.com/drop) veya herhangi bir statik barındırma ile yayınlanır (HTTPS gerekir: PWA için).
- Yayından sonra yapılacak (Supabase panelinde): Authentication > URL Configuration > Site URL'yi yayın adresi yap; test için Authentication > Providers > Email > "Confirm email" kapatılabilir.
- Uçtan uca veritabanı testi (rezervasyon, adet sınırı, iptal, teslim, puan, istatistik, şablon yayını) canlı fonksiyonlarda geri alınan bir blokta çalıştırıldı; hepsi geçti.

## Netlify ile hep güncel yayın
- Netlify sitesi oluşturuldu: `kirinti-app` (https://kirinti-app.netlify.app, id `63317cdb-ba4e-47e0-9b36-4f8fb46497c7`); henüz içine yayın yüklenmedi.
- `netlify.toml` var: Netlify'da "Import from Git" ile depoyu bağlayınca build (`sh build.sh`) ve yayın (`dist/`) otomatik olur; her push siteyi günceller.
- Netlify varsayılan olarak ekip girişi (SSO) ister; herkese açık yapmak için Site configuration > Access & security > Visitor access bölümünden kapat.

## Profesyonel yenileme (2026-10-07)
Too Good To Go'nun (Almanya) sitesi ve uygulaması örnek alındı (site engelli olduğu için bilinen yapıya göre). Tanıtım sayfası baştan: sabit menü, gerçek uygulama ekranlı açılış (`assets/screens/`), FAO/UNEP gerçeklerini veren bant, 3 adım, kategoriler, "neden", işletme bölümü + form, SSS, bekleme listesi, sütunlu alt bilgi. Bekleme listesindeki gizli e-posta kutusu hatası düzeltildi. Uygulama: ilk açılışta 3 adımlı tanıtım, profil menüsü, yardım/SSS sayfası, kartlarda "Son N dk" etiketi.

## Alan adı: kirinti-app.com
Kontrol edildiğinde müsaitti (ilk yıl ~16 USD); satın alınmadı. Yapılacaklar: 1) herhangi bir alan adı sağlayıcısından kayıt et, 2) Netlify > Domain management > Add custom domain: `kirinti-app.com` (DNS kayıtlarını Netlify söyler; HTTPS otomatik), 3) Supabase > Authentication > URL Configuration > Site URL: `https://kirinti-app.com`, 4) `www.kirinti-app.com` yönlendirmesi. Sitede `canonical` ve `og:url` bu adrese ayarlı.


## Ödeme, bağış, dil, açılış (Ekim 2026)
- Ödeme seçenekleri (kart, PayPal; Apple/Google Pay "yakında") şu an TEST modu; gerçek tahsilat için iyzico/PayPal hesabı gerekir.
- Bağış: ödemede 0/5/10/20 ₺ (Filistin); işletme profilinde gelirinin %'si bağış taahhüdü. Gerçek bağış için yetkili yardım kuruluşu + yasal izin şart.
- Dil: `assets/i18n.js` (TR/EN çalışma zamanı çevirisi, `localStorage.kirinti_lang`). Yeni metinler için EXACT/PHR sözlüğüne ekle.
- Açılış animasyonu (`#splash`), kategori şeridi, `assets/visuals/friends.svg`.
- Eski 2 argümanlı `reserve_bag` hâlâ veritabanında; DROP tekrar denenmeli.
