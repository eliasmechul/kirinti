Supabase projesi: `kirinti` (eu-central-1). Şema, MCP üzerinden migration olarak uygulandı:
- tablolar: profiles, businesses, bags, orders (hepsinde RLS açık)
- fonksiyonlar: reserve_bag (stok düşer + kod üretir), complete_order (mekân sahibi kodu doğrular)
Uygulamadaki anahtar yalnızca "publishable" olandır; service_role anahtarını asla koda koyma.
