# iyzico canlı başvuru hazırlığı (şirket kurulduktan sonra)

**Genelde istenenler (iyzico'dan güncel listeyi teyit et):** vergi levhası, ticaret sicil gazetesi/kuruluş belgesi, imza sirküleri, kimlik, IBAN (şirket adına), web sitesi ve işletme bilgileri.

**Sitede eksikler (şirket bilgileri belli olunca ben yazarım, yayın onayın):**
| Metin | Durum |
|---|---|
| Gizlilik politikası | Var (gizlilik/) |
| Hesap silme | Var (hesap-silme/) |
| Kullanım koşulları | Yok, anasayfada "yakında" |
| Mesafeli satış sözleşmesi / ön bilgilendirme | Yok |
| İptal ve iade koşulları | Yok |
| Şirket unvanı, adres, vergi no, iletişim (sitede ve altbilgide) | Yok, şirket kurulunca |
| Çerez/aydınlatma metni (KVKK) | Gizlilik içinde kısmen |

**Teknik (hazır):** pay-init/callback/cancel/card fonksiyonları, sandbox testi geçti, `PAY_ONLINE=false`.
**Canlıya alırken:** gerçek iyzico anahtarlarını Supabase secrets'a sen koyarsın, ben `PAY_ONLINE=true` yapıp test ederim. Payout (hakediş) geçişi (`supabase/sql/payouts.sql`) 6493 görüşünden sonra uygulanır.
