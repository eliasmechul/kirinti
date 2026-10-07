Supabase projesi: `kirinti` (eu-central-1). Şema, MCP üzerinden migration olarak uygulandı:
- tablolar: profiles, businesses, bags, orders (hepsinde RLS açık)
- fonksiyonlar: reserve_bag (stok düşer + kod üretir), complete_order (mekân sahibi kodu doğrular)
Uygulamadaki anahtar yalnızca "publishable" olandır; service_role anahtarını asla koda koyma.

## v2 (2026-10-07) — `supabase/migrations/20261007_platform_v2.sql`
Canlı projeye uygulandı (migration adları `platform_v2`, `platform_v2_cron`). Yalnızca ekleme yapar.
- `orders`: durumlar `bekliyor | teslim | iptal | gelmedi`; `payment_status` (şimdilik `simule`), `commission_rate/amount`, `payout_amount` (varsayılan %30), `cancelled_at`.
- `reserve_bag`: artık teslim tarihi/saati, kendi paketini ayırma ve paket başına en fazla 3 adet kontrolü yapar.
- `cancel_order(id)`: teslim penceresi başlamadan iptal; stok geri gelir, `payment_status = iade`.
- `expire_orders()` (pg_cron, 15 dk): süresi geçen siparişleri `gelmedi` yapar.
- `reviews` + `rate_order(id, puan, yorum)` + `business_ratings` görünümü: yalnızca teslim alınan sipariş puanlanır.
- `favorites`: hesaba bağlı favoriler (RLS: herkes yalnızca kendininkini görür).
- `bag_templates` + `publish_template_bags()` (pg_cron, her gün 00:05 TR) + `publish_my_templates()`: tekrarlayan paketler.
- `business_stats(business_id)`: bugünkü sipariş/kazanç, toplam öğün, gelmeyen, puan.
- Güvenlik: zamanlanmış fonksiyonlar yalnızca sunucuda; müşteri fonksiyonları yalnızca giriş yapmış kullanıcıya açık (anonim erişim kapalı). Danışman uyarıları (`authenticated_security_definer_function_executable`) bilerek böyle: her fonksiyon `auth.uid()` ile yetkiyi kendisi kontrol eder.
