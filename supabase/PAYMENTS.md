# Gerçek ödeme (iyzico) – kurulum ve test

## Nasıl çalışıyor
1. Müşteri "Kaydırarak öde" der → `start_payment` paketi **10 dk ayırır**, sipariş `odeme_bekliyor` olur.
2. `pay-init` fonksiyonu tutarı **sunucuda** okur, iyzico'dan ödeme sayfası adresi alır; müşteri iyzico'nun sayfasına gider.
   Kart bilgisi Kırıntı'ya, uygulamaya veya veritabanına **hiç ulaşmaz**.
3. İyzico sonucu `pay-callback` fonksiyonuna bildirir; fonksiyon sonucu iyzico'dan **doğrular** ve `finalize_payment` ile siparişi kesinleştirir
   (tutar uyuşmazsa reddeder ve parayı iade eder). Müşteri `…/app/?pay=ok&order=…` ile teslim koduna döner.
4. Ödeme olmazsa/vazgeçilirse/10 dk dolarsa stok otomatik geri bırakılır (`release_expired_payments`, 2 dakikada bir).
5. İptal: `pay-cancel` önce iptal edilebilirliği kontrol eder, iyzico'dan iptal/iade yapar, sonra siparişi kapatır.
6. Eski "doğrudan rezervasyon" (`reserve_bag`) ve bağış (`add_donation`) fonksiyonları kullanıcılara **kapatıldı**.

## Kayıtlı kart (Too Good To Go gibi tek dokunuş)
- İlk ödemede kullanıcı kartını **iyzico'nun sayfasında** kaydedebilir. İyzico bir anahtar (`cardUserKey`) verir; biz **yalnızca bu anahtarı ve kartın son 4 hanesini** saklarız (`payment_profiles`; istemci tabloya doğrudan erişemez).
- Sonraki ödemelerde `pay-init` bu anahtarı gönderir; iyzico sayfasında kayıtlı kart hazır gelir. Onay ekranında "Visa •••• 0008" görünür.
- Profil → "Kayıtlı kartı sil" (`pay-card`) kartı iyzico'dan ve bizden siler; hesap silinirken de silinir.
- **Uygulamanın içinde kart alanı göstermiyoruz:** bu, kart verisi güvenliği (PCI DSS) yükümlülüğü getirir. **Apple Pay / Google Pay / PayPal** gibi yöntemler iyzico hesabınızda açılıp açılmadığına bağlıdır; iyzico ile görüşülüp doğrulanmadan eklenmeyecek.

## Senin yapacakların (test için, ~5 dk)
1. https://sandbox-merchant.iyzipay.com adresinde ücretsiz **sandbox hesabı** aç → Ayarlar → API anahtarları: **API Key** ve **Secret Key**.
2. Supabase paneli → **Edge Functions → Secrets** bölümüne şunları ekle (anahtarları kimseyle paylaşma, koda yazma):

   | Ad | Değer |
   |---|---|
   | `IYZICO_API_KEY` | sandbox API Key |
   | `IYZICO_SECRET_KEY` | sandbox Secret Key |
   | `IYZICO_BASE_URL` | `https://sandbox-api.iyzipay.com` |
   | `SITE_URL` | `https://kirinti-app.com` |

3. Uygulamada bir paket ayır → iyzico sayfasında **iyzico'nun yayımladığı test kartını** kullan (kart no 5528 7900 0000 0008, son kullanma gelecekteki herhangi bir tarih, CVC 123; 3D Secure şifresi sandbox sayfasında yazar).
   Test sonrası: sipariş "Aktif" görünmeli, teslim kodu gelmeli; "Siparişi iptal et" iade akışını dener.

## Canlıya geçiş (gerçek para)
- iyzico'ya **üye iş yeri** olarak başvur (şirket/şahıs şirketi belgeleri), onaydan sonra gerçek API anahtarlarını al.
- Secrets'ta `IYZICO_API_KEY`, `IYZICO_SECRET_KEY` değerlerini gerçek anahtarlarla değiştir, `IYZICO_BASE_URL` = `https://api.iyzipay.com`.
- **Komisyon:** Standart %30; yeni işletmelere ilk 90 gün indirimli %20 (`business_terms` tablosu, işletme sahibi görür ama değiştiremez).
  Oranı değiştirmek için Supabase SQL: `update public.business_terms set commission_rate = 0.25, promo_rate = 0.15, promo_until = '2027-03-01' where business_id = '<işletme id>';`
  Sipariş anındaki oran sipariş satırında saklanır, sonradan değişen oran eski siparişleri etkilemez.
- **Restoranlara pay dağıtımı:** Şu an tahsil edilen tutarın tamamı Kırıntı'nın iyzico hesabına gider; komisyon ve restoran payı siparişte hesaplanır
  (`commission_amount`, `payout_amount`) ama restoranlara aktarım otomatik değildir. Otomatik bölüşüm için iyzico **Pazaryeri** (alt üye işyeri) ürünü gerekir;
  bu karar ve başvuru ayrı bir adımdır (lisanslı kuruluş şartı nedeniyle parayı Kırıntı kendi hesabından dağıtmamalı, hukuki/mali müşavir görüşü alınmalı).
- Fatura/KDV süreçleri için mali müşavire danış.

## Bilinen varsayımlar (testte doğrulanacak)
- Alıcı kimlik no alanı iyzico API'sinde zorunlu; şimdilik sabit `11111111111` gönderiliyor (iyzico bunu doğrulamıyorsa sorun yok, doğruluyorsa kullanıcıdan alınmalı).
- `paymentPageUrl` alanı sandbox yanıtında gelmezse `pay-init` "Ödeme başlatılamadı" döner; o durumda yanıttaki `checkoutFormContent` ile sayfa içi form kullanılmalı.
- İmza (IYZWSv2) ve iptal/iade çağrıları yalnızca iyzico belgelerine göre yazıldı; **gerçek sandbox anahtarlarıyla ilk denemeye kadar test edilmedi**.
