/* Kırıntı: Türkçe / English
 * Dil tarayıcı diline göre seçilir (Türkçe değilse İngilizce), kullanıcı değiştirince saklanır.
 * Sayfa Türkçe yazılır; İngilizce seçilince metinler çalışma anında çevrilir (yeni eklenen öğeler dahil).
 * İşletmelerin kendi yazdığı metinler (mekân adı, paket başlığı, açıklama) çevrilmez. */
(function () {
  'use strict';
  var KEY = 'kirinti_lang';
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  var lang = saved || ((navigator.language || 'tr').toLowerCase().indexOf('tr') === 0 ? 'tr' : 'en');
  function setLang(l) { try { localStorage.setItem(KEY, l); } catch (e) {} location.reload(); }
  window.KIRINTI_LANG = lang;
  window.setKirintiLang = setLang;
  document.documentElement.lang = lang;
  if (lang !== 'en') { window.T = function (s) { return s; }; return; }

  // Tek başına geçerli kısa etiketler: yalnızca metin tam eşleşirse çevrilir (mekân adları bozulmasın)
  var EXACT = {
    'Bağış': 'Donation', 'Paket': 'Bag', 'Başlangıç': 'Start', 'Ayrıntılar': 'Details', 'Şifre': 'Password',
    'İş': 'Work', 'Ev': 'Home', 'Ara': 'Search', 'SSS': 'FAQ', 'Kafe': 'Café',  'Bitiş': 'End', 'Bugün': 'Today',
    'Diğer': 'Other', 'Ekmek': 'Bread', 'Fırın': 'Bakery', 'Gözat': 'Browse', 'Hepsi': 'All', 'Kapat': 'Close', 'Konum': 'Location',
    'Liste': 'List', 'Manav': 'Greengrocer', 'Tamam': 'Done', 'Yasal': 'Legal', 'Yemek': 'Meals', 'kaldı': 'left',
    'Çıkış': 'Log out', '3 adım': '3 steps', 'Başvur': 'Apply', 'Geçmiş': 'Past', 'Aktif': 'Active', 'Gönder': 'Send', 'Harita': 'Map',
    'Kaldır': 'Remove', 'Kaydet': 'Save', 'Keşfet': 'Discover', 'Market': 'Market', 'Onayla': 'Confirm', 'Profil': 'Profile',
    'Toplam': 'Total', 'Vazgeç': 'Cancel', 'Yardım': 'Help', 'yıldız': 'stars', 'Ambalaj': 'Packaging', 'E-posta': 'Email',
    'Pastane': 'Pastry', 'Temizle': 'Clear', 'Tükendi': 'Sold out', 'Yakında': 'Coming soon', 'Açıklama': 'Description',
    'Kahvaltı': 'Breakfast', 'Kayıt ol': 'Sign up', 'Yemekler': 'Meals', 'Yorumlar': 'Reviews', 'İstanbul': 'Istanbul',
    'Favoriler': 'Favourites', 'Filtreler': 'Filters', 'Giriş yap': 'Log in', 'Sonuç yok': 'No results', 'Siparişler': 'Orders',
    'Süre doldu': 'Time is up', 'Tükenenler': 'Sold out', 'Tümünü gör': 'See all', 'Vejetaryen': 'Vegetarian', 'Yol tarifi': 'Directions',
    'İşletmeler': 'Businesses', 'Rezerve et': 'Reserve', 'Mesafe': 'Distance', 'Fiyat': 'Price',  'Şimdi': 'Now',
    'Sabah': 'Morning', 'Öğle': 'Noon', 'Akşam': 'Evening', 'Gece': 'Night', 'Yok': 'None', 'Sırala': 'Sort by', 'Kapanış': 'Closing',
    'Restoran': 'Restaurant', 'Çorba': 'Soup', 'Teslim:': 'Pickup:', 'Ödeme:': 'Payment:', 'Pastane ürünleri': 'Pastries',
    'Kayıtlı konum': 'Saved location', 'Başka konum': 'Other location', 'Seçili konum': 'Selected location', 'Şu anki konum': 'Current location',
    'Hoş geldin!': 'Welcome!', 'Teşekkürler!': 'Thank you!', 'İleri': 'Next', 'Atla': 'Skip', 'Başlayalım': 'Let’s start', 'Çıkış yap': 'Log out',
    'Ekle': 'Add', 'Sil': 'Delete', 'Adet': 'Quantity', 'Tekrar': 'Repeat', 'Şehir': 'City', 'Geri': 'Back', 'Paylaş': 'Share', 'Artır': 'Increase', 'Azalt': 'Decrease', 'Duraklat': 'Pause', 'Devam ettir': 'Resume', 'Gelmedi': 'No-show', 'Yayınla': 'Publish', 'Kırıntı': 'Kırıntı', 'Neden': 'Why', 'Sebze': 'Vegetables', 'Meyve': 'Fruit', 'Kahve': 'Coffee'
  };

  // Çok sözcüklü ifadeler: metnin herhangi bir yerinde, sözcük sınırıyla eşleşir
  var PHR = {
    'Kapanıştan önce satılamayan ama hâlâ taptaze ürünlerin, içeriği sürpriz olarak, normal fiyatın çok altında satıldığı pakettir.': 'A bag of food that went unsold before closing but is still fresh, sold with a surprise inside at a fraction of the normal price.',
    'Yukarıdaki formu doldur, seninle iletişime geçelim. Katıldıktan sonra paket sayısını, fiyatı ve saati kendin belirler, teslimleri kodla onaylarsın.': 'Fill in the form above and we’ll get in touch. Once you’ve joined, you set the number of bags, the price and the time, and confirm pickups with a code.',
    'Kırıntı uygulaması:': 'Kırıntı app:', 'Keşfet ekranı, yakındaki paketler': 'Discover screen, bags nearby',
    'paket detayı ve rezerve et düğmesi': 'bag details and reserve button', 'paket listesi ve filtreler': 'bag list and filters',
    'paket detayı': 'bag details', 'teslim kodu ekranı': 'pickup code screen',
    'Çizim: iki arkadaş, Kırıntı çantasından kurtardıkları yemeği paylaşıyor': 'Illustration: two friends sharing food they rescued with a Kırıntı bag',
    'Konumu değiştir': 'Change location', 'Ara: Gözat sekmesini açar': 'Search: opens the Browse tab',
    'İndirimli fiyat': 'Discounted price', 'Normal fiyat': 'Original price', 'Ayrıntılar': 'Details', 'Şifre': 'Password',
    'Başlangıç': 'Start', 'Ödeme: ': 'Payment: ', 'Kredi / banka kartı': 'Credit / debit card',
    // ---- Uygulama: gezinme, kartlar, listeler
    'Seçili konum': 'Selected location', 'Mekân, yemek veya tür ara': 'Search venue, food or type',
    'Yakınındaki': 'Nearby', 'Sürpriz Paketler': 'Surprise Bags', 'Çevrendeki favoriler': 'Favourites near you',
    'Kaçmadan kurtar': 'Rescue before it’s gone', 'Yeni paketler': 'New bags', 'Ekmek & fırın': 'Bread & bakery',
    'Sebze & meyve': 'Vegetables & fruit', 'Hazır yemek': 'Ready meals', 'Şimdi teslim': 'Pickup now', 'Şimdi teslim alınabilir': 'Available now',
    'Restoranlar': 'Restaurants', 'Kafeler': 'Cafés', 'uzaklıkta': 'away', 'adet kaldı': 'left', 'Paketler yükleniyor…': 'Loading bags…', 'Tekrar dene': 'Try again',
    'Paketler yüklenemedi. İnternet bağlantını kontrol et.': 'Couldn’t load bags. Check your internet connection.',
    'Paketler güncellenemedi': 'Couldn’t refresh bags', 'Aramana uygun paket bulunamadı.': 'No bags match your search.',
    'Bu aramaya uygun paket yok.': 'No bags match this search.', 'Filtreleri ve aramayı temizle': 'Clear filters and search',
    'Konumun alınıyor…': 'Getting your location…', 'Konum izni verilmedi': 'Location permission denied', 'Bu cihazda konum desteklenmiyor': 'Location isn’t supported on this device',
    'Şu anki konumunu kaydet': 'Save your current location', 'Konum kaydedildi': 'Location saved', 'Harita yüklenemedi': 'Couldn’t load the map', 
    'Mekân, yemek veya tür ara': 'Search venue, food or type', 'Restoran, kafe veya yemek ara': 'Search restaurant, café or food',
    // ---- Filtre paneli
    'Teslim saati': 'Pickup time', 'Ne kurtarmak istersin?': 'What do you want to rescue?', 'En yüksek fiyat': 'Maximum price',
    'Tükenenleri gizle': 'Hide sold out', 'Bitiş saati': 'Ending time', 'paketi göster': 'show bags', 'Sonuç yok': 'No results',
    // ---- Detay
    'Bu sürpriz paket hakkında': 'About this surprise bag', 'Sürpriz paket ·': 'Surprise bag ·', 'indirim': 'off', 'değerlendirme': 'reviews',
    'Rotayı göster': 'Show route', 'Teslim bilgisi': 'Pickup info', 'İçindekiler ve alerjenler': 'Contents and allergens',
    'Siparişini ve teslim kodunu mekândaki bir çalışana göstererek sürpriz paketini teslim al.': 'Show your order and pickup code to a staff member at the venue to collect your surprise bag.',
    'Kendi çantanı veya kabını getirmeni öneririz.': 'We recommend bringing your own bag or container.',
    'Mekânın gün sonunda kalan lezzetli ürünleri.': 'Tasty items the venue has left at the end of the day.',
    'Adres bilgisi yok': 'No address available', 'Bağlantı kopyalandı': 'Link copied', 'Paylaşılamadı': 'Couldn’t share',
    'Favorilere eklendi': 'Added to favourites', 'Favorilerden çıkarıldı': 'Removed from favourites',
    // ---- Giriş
    'Giriş yap / Kayıt ol': 'Log in / Sign up', 'Paket ayırmak için giriş yapmalısın.': 'Log in to reserve a bag.', 'Şifre (en az 6 karakter)': 'Password (at least 6 characters)',
    'Şifremi unuttum': 'Forgot password', 'Giriş yapıldı': 'Logged in', 'E-posta veya şifre hatalı': 'Wrong email or password', 'E-postanı doğrula': 'Verify your email',
    'Kayıt tamam. E-postanı doğrula.': 'You’re signed up. Verify your email.', 'Önce e-posta adresini yaz': 'Enter your email address first',
    'Şifre yenileme bağlantısı e-postana gönderildi': 'A password reset link was sent to your email', 'Gönderilemedi, tekrar dene': 'Couldn’t send, try again',
    // ---- Onay, ödeme, bağış
    'Siparişi onayla': 'Confirm order', 'Ödeme yöntemi': 'Payment method', 'Kredi / banka kartı': 'Credit / debit card',
    'Visa, Mastercard, Troy · test modu': 'Visa, Mastercard, Troy · test mode', 'PayPal hesabınla öde · test modu': 'Pay with your PayPal account · test mode',
    'Bağış ekle': 'Add a donation', '(isteğe bağlı)': '(optional)', 'Bağış yok': 'No donation', 'Filistin bağışı': 'Palestine donation',
    'Filistin\'deki insanlara destek ol. Bağışlar, yardım ulaştıran yetkili bir kuruluş üzerinden aktarılacaktır. Test modunda gerçek tahsilat yapılmaz.': 'Support people in Palestine. Donations will be passed on through an authorised aid organisation. No real money is charged in test mode.',
    'Ödeme şimdilik simüle edilir; gerçek tahsilat yapılmaz. Gerçek kart bilgisi girmene gerek yok.': 'Payment is simulated for now; nothing is really charged. You don’t need to enter real card details.',
    'Kaydırarak onayla': 'Swipe to confirm', 'Üzgünüz, paket az önce tükendi': 'Sorry, that bag just sold out', 'Bağış eklenemedi, siparişin tamamlandı': 'Couldn’t add the donation, but your order is complete',
    
    // ---- Teslim kodu
    'Paketin hazır': 'Your bag is ready', 'Teslim kodu': 'Pickup code', 'Yol tarifi al': 'Get directions', '(test)': '(test)',
    'Yemeğini teslim alırken bu kodu mekâna göster.': 'Show this code at the venue when you collect your food.',
    // ---- Siparişler
    'Siparişlerini görmek için giriş yap.': 'Log in to see your orders.', 'Henüz siparişin yok. Bir paket kurtar!': 'No orders yet. Rescue a bag!',
    'Kodu mekâna göstermek için dokun': 'Tap to show the code at the venue', 'Siparişi iptal et': 'Cancel order', 'Teslim alındı': 'Collected',
    'İptal edildi': 'Cancelled', 'İptal edildi · iade edilecek': 'Cancelled · will be refunded', 'Teslim alınmadı': 'Not collected',
    'Siparişi iptal etmek istiyor musun? Ödemen iade edilir.': 'Do you want to cancel the order? Your payment will be refunded.',
    'Sipariş iptal edildi': 'Order cancelled', 'Paketini nasıl buldun?': 'How was your bag?', 'Yorum (isteğe bağlı)': 'Comment (optional)', 'Puanla': 'Rate',
    'Teşekkürler!': 'Thank you!', 'Filistin\'e bağış (test)': 'Donated to Palestine (test)',
    // ---- Favoriler
    'Henüz favorin yok. Kalbe dokunarak mekânları buraya ekle.': 'No favourites yet. Tap the heart to add venues here.',
    // ---- Profil
    'sipariş ·': 'orders ·', 'öğün kurtardın': 'meals rescued', 'tasarruf': 'saved', 'CO₂ azaldı*': 'CO₂ reduced*',
    '*Kurtarılan öğün başına ortalama 2,5 kg CO₂e varsayımıyla.': '*Assuming an average of 2.5 kg CO₂e per rescued meal.',
    'Siparişlerim': 'My orders', 'Favorilerim': 'My favourites', 'Nasıl çalışır?': 'How it works', 'Yardım ve sık sorulanlar': 'Help and FAQ',
    'İşletme paneli': 'Business dashboard', 'Restoran, fırın, kafe veya manav sahibi misin?': 'Do you own a restaurant, bakery, café or greengrocer?',
    'Kırıntı · Sürüm 1.0': 'Kırıntı · Version 1.0', 'Ödeme şu an test aşamasında; gerçek tahsilat yapılmaz.': 'Payment is in test mode right now; nothing is really charged.',
    'Dil / Language': 'Language', 'Türkçe': 'Türkçe', 'Giriş yap / Kayıt ol': 'Log in / Sign up',
    // ---- Yardım
    'Sürpriz paket nedir?': 'What is a surprise bag?', 'Paketimi nasıl alırım?': 'How do I collect my bag?', 'Siparişimi iptal edebilir miyim?': 'Can I cancel my order?',
    'Paketi zamanında alamazsam?': 'What if I can’t collect on time?', 'Ödeme nasıl çalışıyor?': 'How does payment work?', 'İşletmemi nasıl eklerim?': 'How do I add my business?',
    'Kapanıştan önce satılamayan ama hâlâ taptaze ürünlerin, içeriği sürpriz olarak, normal fiyatın çok altında satıldığı pakettir. İçerik gün sonuna göre değişir; alerjen bilgisi paket sayfasındadır.': 'A surprise bag holds products that went unsold before closing but are still fresh. The contents are a surprise and sold far below the normal price. Contents vary by end of day; allergen info is on the bag page.',
    'Paketi rezerve et, belirtilen saat aralığında mekâna git ve 4 haneli teslim kodunu göster. Kodu Siparişler sekmesinde her zaman bulabilirsin.': 'Reserve the bag, go to the venue within the pickup window and show your 4-digit code. You can always find the code in the Orders tab.',
    'Evet. Teslim saati başlamadan önce Siparişler sekmesinden iptal edebilirsin; paket stoğa geri döner. Ödeme açıldığında tutar iade edilir.': 'Yes. You can cancel from the Orders tab before the pickup window starts; the bag goes back into stock. Once payments are live, the amount is refunded.',
    'Teslim saati geçen sipariş “teslim alınmadı” olarak kapanır. Rezerve etmeden önce saat aralığını kontrol et.': 'An order whose pickup time has passed is closed as “not collected”. Check the time window before you reserve.',
    'Ödeme adımı şu an test aşamasındadır; gerçek kart tahsilatı yapılmaz. Gerçek ödeme açıldığında duyuracağız.': 'The payment step is in test mode right now; no real card payment is taken. We’ll announce it when real payments open.',
    'Profil sekmesindeki İşletme paneli bölümünden mekânını kaydet, paketlerini ekle veya tekrarlayan paket kur.': 'Register your venue in the Business dashboard section of the Profile tab, add bags or set up recurring bags.',
    'Aradığını bulamadın mı? Yakında destek hattı eklenecek.': 'Can’t find what you need? A support line is coming soon.',
    // ---- Tanıtım ekranları
    'Yakınındakini keşfet': 'Discover what’s nearby', 'Sürpriz paketini ayır': 'Reserve your surprise bag', 'Kodunla teslim al': 'Collect with your code',
    'Restoran, fırın, kafe ve manavların kapanıştan önce artan yemeklerini haritada ve listede gör.': 'See the food left over at restaurants, bakeries, cafés and greengrocers before closing, on the map and in the list.',
    'Beğendiğin paketi kaydırarak onayla. Teslim saati başlamadan istediğin zaman iptal edebilirsin.': 'Swipe to confirm the bag you like. You can cancel any time before the pickup window starts.',
    'Belirtilen saatte mekâna git, 4 haneli kodunu göster ve paketini al. Yemek çöpe gitmesin.': 'Go to the venue at the pickup time, show your 4-digit code and take your bag. Don’t let good food go to waste.',
    // ---- İşletme paneli
    'İşletmeni kaydet': 'Register your business', 'İşletme adı': 'Business name', 'Restoran / Lokanta': 'Restaurant', 'Fırın / Pastane': 'Bakery / Pastry shop',
    'Konumumu kullan': 'Use my location', 'Konum alındı ✓': 'Location received ✓', 'İşletme kaydedildi': 'Business saved',
    'bugün sipariş': 'orders today', 'bugün teslim': 'collected today', 'bugünkü kazanç': 'today’s earnings', 'kurtarılan öğün': 'meals rescued',
    'gelmeyen': 'no-shows', 'Kazanç, %30 komisyon düşüldükten sonraki tutardır (ödeme henüz simüle).': 'Earnings are shown after the 30% commission (payment is still simulated).',
    'Yeni sürpriz paket': 'New surprise bag', 'Paket adı': 'Bag name', 'Paket adı (örn. Akşam Yemeği Paketi)': 'Bag name (e.g. Dinner Bag)',
    'Kısa açıklama / alerjen bilgisi': 'Short description / allergen info', 'Normal ₺': 'Normal ₺', 'İndirimli ₺': 'Discounted ₺', 
    'Yalnızca bugün': 'Today only', 'Her gün': 'Every day', 'Hafta içi': 'Weekdays', 'Hafta sonu': 'Weekends',
    'Paket fotoğrafı (isteğe bağlı)': 'Bag photo (optional)', 'Tekrarlayan paketler': 'Recurring bags', 'Bugünkü paketler': 'Today’s bags', 'Aktif paket yok.': 'No active bags.', 'Teslim bekleyen siparişler': 'Orders awaiting pickup',
    'Müşteri kodu': 'Customer code', 'Bekleyen sipariş yok.': 'No pending orders.', 'Geçmiş siparişler': 'Past orders', 'Teslim edildi': 'Delivered',
    'Paket yayınlandı': 'Bag published', 'Tekrarlayan paket kaydedildi': 'Recurring bag saved', 'Teslim onaylandı': 'Pickup confirmed',
    'Kod yanlış': 'Wrong code', 'Bu paketi kaldırmak istiyor musun?': 'Do you want to remove this bag?',
    'Tekrarlayan paketi silmek istiyor musun? Bugünkü paket etkilenmez.': 'Delete this recurring bag? Today’s bag isn’t affected.',
    'İndirimli fiyat normalden düşük olmalı': 'The discounted price must be lower than the normal price', 'Bitiş saati başlangıçtan sonra olmalı': 'End time must be after start time',
    'Fotoğraf yüklenemedi': 'Couldn’t upload the photo', 'Henüz bağış yok.': 'No donations yet.', 'Şimdiye kadar bağışlanan:': 'Donated so far:',
    '(müşteri ve işletme bağışları, test)': '(customer and business donations, test)', 'Bağış oranı': 'Donation rate',
    'Kazancının bir kısmını Filistin\'deki insanlara bağışla. Seçtiğin oran, her teslim edilen siparişin kazancından otomatik ayrılır ve yetkili bir yardım kuruluşu üzerinden aktarılır (test modunda gerçek aktarım yapılmaz).': 'Donate part of your earnings to people in Palestine. The rate you choose is set aside automatically from each collected order and passed on through an authorised aid organisation (nothing is really transferred in test mode).',
    'Otomatik bağış kapatıldı': 'Automatic donation turned off', 'İşletme paneli için giriş yap.': 'Log in to use the business dashboard.',
    'Mekânda isen "Konumumu kullan"a bas. Aksi hâlde seçili konum': 'If you’re at the venue, tap “Use my location”. Otherwise the selected location',
    // ---- Genel / site
    'İçeriğe geç': 'Skip to content', 'Gıda israfına karşı': 'Against food waste', 'İyi yemek çöpe gitmesin': 'Don’t let good food go to waste',
    'Uygulamayı dene': 'Try the app', 'İşletmeni kaydet': 'Register your business', 'Nasıl çalışır?': 'How it works', 'Neler kurtarılır?': 'What gets rescued?',
    'Neden Kırıntı?': 'Why Kırıntı?', 'İşletmeler için': 'For businesses', 'Sık sorulanlar': 'FAQ', 'Aklına takılanlar': 'Your questions',
    'Kırıntı, kapanıştan önce satılamayan ama hâlâ taptaze yemekleri mahalledeki restoran, fırın, kafe ve manavlardan ': 'Kırıntı brings you food that went unsold before closing but is still fresh, from your neighbourhood restaurants, bakeries, cafés and greengrocers, as a ',
    'sürpriz paket': 'surprise bag', ' olarak uygun fiyata sana ulaştırır.': ' at a low price.',
    'Dünyada üretilen gıdanın yaklaşık üçte biri tüketilmeden israf ediliyor.': 'About a third of all food produced in the world is wasted before it is eaten.',
    'Küresel sera gazı salımının bu orandaki kısmı gıda israfından geliyor.': 'This share of global greenhouse gas emissions comes from food waste.',
    'Keşfet, rezerve et, teslim al. Paketin çöpe gitmeden sofrana gelir.': 'Discover, reserve, collect. Your bag reaches your table before it reaches the bin.',
    'Kaynak: FAO ve UNEP gıda israfı raporları.': 'Source: FAO and UNEP food waste reports.',
    'Üç adımda paketin elinde': 'Your bag in three steps', 'Telefonundan birkaç dokunuşla yakınındaki bir mekânın artan yemeğini kurtar.': 'Rescue a nearby venue’s leftover food with a few taps on your phone.',
    'Haritada veya listede mekânları gez. Teslim saati, tür, mesafe ve fiyata göre filtrele.': 'Browse venues on the map or in the list. Filter by pickup time, type, distance and price.',
    'Beğendiğin paketi seç, kaydırarak onayla. Teslim saati başlamadan istediğin zaman iptal edebilirsin.': 'Pick the bag you like and swipe to confirm. You can cancel any time before the pickup window starts.',
    'Belirtilen saatte mekâna git, 4 haneli kodunu göster ve paketini al. Afiyet olsun.': 'Go to the venue at the pickup time, show your 4-digit code and take your bag. Enjoy!',
    'Her damak için bir paket': 'A bag for every taste', 'Restoranlardan fırınlara, kafelerden manavlara kadar günün artan ürünleri.': 'From restaurants to bakeries, cafés to greengrocers: the day’s leftover goods.',
    'Cebine, mahalleline ve gezegene iyi gelir': 'Good for your wallet, your neighbourhood and the planet', 'Uygun fiyat': 'Great prices', 'Daha az israf': 'Less waste',
    'Yeni lezzetler': 'New flavours', 'Kolay teslim': 'Easy pickup', 'Paketler normal fiyatın çoğu zaman yarısı veya daha azı.': 'Bags are often half the normal price or less.',
    'Çöpe gidecek yemeği ve üretimine harcanan kaynakları kurtarırsın.': 'You save food headed for the bin and the resources used to make it.',
    'Yakınındaki restoran, fırın, kafe ve manavları keşfet.': 'Discover restaurants, bakeries, cafés and greengrocers near you.',
    'Rezerve et, kodunu göster, paketini al. Sıra beklemek yok.': 'Reserve, show your code, take your bag. No queueing.',
    'Artan yemeği gelire dönüştür': 'Turn leftover food into income', 'Restoran, fırın, kafe veya manav: gün sonunda kalan ürünleri çöpe atmadan yeni müşterilere ulaştır.': 'Restaurant, bakery, café or greengrocer: reach new customers with end-of-day products instead of throwing them away.',
    'Paket sayısını, fiyatı ve teslim saatini kendin belirle.': 'Set the number of bags, the price and the pickup time yourself.',
    'Tekrarlayan paketleri bir kez kur, her gün otomatik yayınlansın.': 'Set up recurring bags once and they publish automatically every day.',
    'Teslimi müşterinin 4 haneli koduyla saniyeler içinde onayla.': 'Confirm pickup in seconds with the customer’s 4-digit code.',
    'Satışlarını, kazancını ve müşteri puanlarını panelden takip et.': 'Track your sales, earnings and customer ratings in the dashboard.',
    'Kazancının bir kısmını Filistin\'deki insanlara bağışlayabilirsin.': 'You can donate part of your earnings to people in Palestine.',
    'Yetkili adı ve telefon': 'Contact name and phone', 'İşletme türü': 'Business type', 'Başvurunu aldık': 'We received your application',
    'Teşekkürler! Başvurunu aldık, seninle iletişime geçeceğiz.': 'Thanks! We received your application and will get in touch.',
    'Harika! Listeye eklendin; şehrin açılınca haber vereceğiz.': 'Great! You’re on the list; we’ll let you know when your city opens.',
    'Bu e-posta zaten listede. Teşekkürler!': 'This email is already on the list. Thanks!', 'Kaydedilemedi, lütfen tekrar dene.': 'Couldn’t save, please try again.',
    'Bağlantı kurulamadı, lütfen sonra tekrar dene.': 'Couldn’t connect, please try again later.',
    'Ödemeyi nasıl yaparım, paketi nasıl alırım?': 'How do I pay and how do I collect my bag?', 'Rezervasyonumu iptal edebilir miyim?': 'Can I cancel my reservation?',
    'Paketimi zamanında alamazsam ne olur?': 'What happens if I can’t collect my bag in time?', 'İşletmem nasıl katılır?': 'How does my business join?',
    'Hangi şehirlerdesiniz?': 'Which cities are you in?', 'Bağış nasıl çalışıyor?': 'How do donations work?',
    'Uygulamada paketi rezerve eder, mekânın belirttiği saat aralığında 4 haneli kodunu göstererek teslim alırsın. Kartla ya da PayPal ile ödeyebilirsin; Apple Pay ve Google Pay yakında. Ödeme adımı şu anda test aşamasındadır; gerçek tahsilat açıldığında duyuracağız.': 'You reserve the bag in the app and collect it within the venue’s pickup window by showing your 4-digit code. You can pay by card or PayPal; Apple Pay and Google Pay are coming soon. The payment step is in test mode right now; we’ll announce it when real charging opens.',
    'Evet. Teslim saati başlamadan önce Siparişler sekmesinden iptal edebilirsin; paket stoğa geri döner. Ödeme aktif olduğunda tutar sana iade edilecek.': 'Yes. You can cancel from the Orders tab before the pickup window starts; the bag goes back into stock. Once payments are live, the amount will be refunded to you.',
    'Teslim saati geçen siparişler “teslim alınmadı” olarak kapanır. Bu yüzden saat aralığını rezervasyondan önce kontrol etmeni öneririz.': 'Orders whose pickup time has passed are closed as “not collected”, so please check the time window before you reserve.',
    'Yukarıdaki formu doldur, seninle iletişime geçelim. Katıldıktan sonra paket sayısını, fiyatı ve saati kendin belirler, teslimleri kodla onaylarsın.': 'Fill in the form above and we’ll get in touch. Once you’ve joined, you set the number of bags, the price and the time, and confirm pickups with a code.',
    'Henüz yayında değiliz. İlk şehrimiz açılırken haber almak için aşağıdaki listeye katılabilirsin.': 'We’re not live yet. Join the list below to hear when our first city opens.',
    'Ödeme sırasında isteğe bağlı bağış ekleyebilirsin; işletmeler de kazançlarının bir kısmını bağışlayabilir. Bağışlar Filistin\'deki insanlara yardım ulaştıran yetkili bir kuruluş üzerinden aktarılacaktır. Şu an test modundayız, gerçek bağış toplanmıyor.': 'You can add an optional donation at checkout, and businesses can donate part of their earnings. Donations will be passed on through an authorised organisation that delivers aid to people in Palestine. We’re in test mode right now; no real donations are collected.',
    'Açıldığında ilk sen öğren': 'Be the first to know when we open', 'Şehrin açılınca haber verelim. Spam yok, yalnızca bir e-posta.': 'We’ll let you know when your city opens. No spam, just one email.',
    'E-posta adresin': 'Your email address', 'Listeye ekle': 'Join the list', 'Başvur': 'Apply',
    'İyi yemek çöpe gitmesin. Mahalledeki artan yemekleri uygun fiyata kurtar.': 'Don’t let good food go to waste. Rescue your neighbourhood’s leftover food at a good price.',
    'Gizlilik & KVKK': 'Privacy & data protection', 'Kullanım koşulları': 'Terms of use', 'Çerez politikası': 'Cookie policy', '(yakında)': '(coming soon)',
    'Gıda israfına karşı, mahalleden başlayarak.': 'Against food waste, starting from the neighbourhood.', 'Ana menü': 'Main menu', 'Kırıntı ana sayfa': 'Kırıntı home',
    'Mağaza uygulamaları': 'Store apps', 'Gıda israfı gerçekleri': 'Food waste facts', 'Profil menüsü': 'Profile menu', 'Kategoriler': 'Categories', 'Görünüm': 'View',
    'Ödeme yöntemi': 'Payment method', 'Bağış tutarı': 'Donation amount', 'Favorilere ekle veya çıkar': 'Add or remove from favourites',
    'Filtreler': 'Filters', 
    // ---- Aylar
    'Ocak': 'January', 'Şubat': 'February', 'Mart': 'March', 'Nisan': 'April', 'Mayıs': 'May', 'Haziran': 'June', 'Temmuz': 'July',
    'Ağustos': 'August', 'Eylül': 'September', 'Ekim': 'October', 'Kasım': 'November', 'Aralık': 'December'
  };

  // Sayılı kalıplar
  var PATTERNS = [
    [/(\d+) kaldı/g, '$1 left'],
    [/Son (\d+) dk/g, 'Last $1 min'],
    [/(\d+) mekân · (\d+) paket/g, '$1 venues · $2 bags'],
    [/Bugün (\d{2}:\d{2})/g, 'Today $1'],
    [/Teslim: (\d{2}:\d{2})/g, 'Pickup: $1'],
    [/(\d+)× /g, '$1× '],
    [/(\d+) paketi göster/g, 'Show $1 bags'],
    [/(\d+) sipariş · (\d+) favori/g, '$1 orders · $2 favourites'],
    [/Kadıköy, İstanbul/g, 'Kadıköy, Istanbul'],
    [/%(\d+)'i bağışlanacak/g, '$1% will be donated'],
    [/Kazancının %(\d+)'i bağışlanacak/g, '$1% of your earnings will be donated'],
    [/(\d+) yorum/g, '$1 reviews'],
    [/^Teslim: /g, 'Pickup: ']
  ];
  var TYPE = { 'Restoran': 'Restaurant', 'Kafe': 'Café', 'Fırın': 'Bakery', 'Manav': 'Greengrocer', 'Market': 'Market' };

  function money(m, th, dec) { return '₺' + th.replace(/\./g, ',') + '.' + dec; }
  var keys = Object.keys(PHR).sort(function (a, b) { return b.length - a.length; });
  var esc = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
  var BIG = new RegExp('(^|[^\\p{L}\\p{N}])(' + keys.map(esc).join('|') + ')(?![\\p{L}\\p{N}])', 'gu');

  function tr(s) {
    var t = s.trim();
    if (!t || !/[\p{L}]/u.test(t)) return s;
    if (Object.prototype.hasOwnProperty.call(EXACT, t)) return s.replace(t, EXACT[t]);
    var o = s;
    o = o.replace(/(\d{1,3}(?:\.\d{3})*),(\d{2}) ₺/g, money);
    o = o.replace(/(\d+) ₺/g, '₺$1');
    PATTERNS.forEach(function (p) { o = o.replace(p[0], p[1]); });
    o = o.replace(/^(Restoran|Kafe|Fırın|Manav|Market)(?= · )/, function (m) { return TYPE[m]; });
    o = o.replace(BIG, function (m, pre, ph) { return pre + PHR[ph]; });
    return o;
  }
  window.T = function (s) { return tr(String(s)); };

  var ATTRS = ['placeholder', 'aria-label', 'alt', 'title', 'content'];
  var OUT = new WeakMap();
  function text(node) {
    var v = node.nodeValue;
    if (OUT.get(node) === v) return;
    var o = tr(v);
    if (o !== v) { OUT.set(node, o); node.nodeValue = o; }
  }
  function attrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (a === 'content' && !(el.tagName === 'META' && /description|og:/.test((el.getAttribute('name') || '') + (el.getAttribute('property') || '')))) continue;
      var v = el.getAttribute && el.getAttribute(a);
      if (v) { var o = tr(v); if (o !== v) el.setAttribute(a, o); }
    }
  }
  function walk(root) {
    if (root.nodeType === 3) { if (!/^(SCRIPT|STYLE)$/.test(root.parentNode.nodeName) && !(root.parentNode.closest && root.parentNode.closest('[data-notranslate]'))) text(root); return; }
    if (root.nodeType !== 1 || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(root.nodeName) || root.closest('[data-notranslate]')) return;
    attrs(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) { if (!/^(SCRIPT|STYLE)$/.test(n.parentNode.nodeName) && !n.parentNode.closest('[data-notranslate]')) text(n); }
      else if (/^(SCRIPT|STYLE|NOSCRIPT)$/.test(n.nodeName) || n.closest('[data-notranslate]')) continue;
      else attrs(n);
    }
  }
  function start() {
    document.title = tr(document.title);
    walk(document.documentElement);
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.type === 'characterData') text(m.target);
        else if (m.type === 'attributes') attrs(m.target);
        else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
      }
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
