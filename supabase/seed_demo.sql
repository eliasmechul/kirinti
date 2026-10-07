-- Demo verisi: mekânlar sahipsiz (owner_id null), paketler her gün şablondan otomatik yayınlanır.
-- Gerçek mekânlar kayıt olunca kendi paketlerini ekler; bu demo mekânlar istenince silinebilir:
--   delete from public.businesses where owner_id is null;

-- 1) Mevcut 5 demo mekân için günlük şablon
insert into public.bag_templates (business_id, title, description, original_price, price, qty, pickup_from, pickup_to, photo_url)
select g.business_id, g.title, g.description, g.original_price, g.price, greatest(g.qty_available, 3), g.pickup_from, g.pickup_to, g.photo_url
from (select distinct on (business_id) * from public.bags order by business_id, created_at desc) g
where not exists (select 1 from public.bag_templates t where t.business_id = g.business_id and t.title = g.title);

-- 2) Yeni türler için 3 demo mekân (fırın, manav, hazır yemek)
insert into public.businesses (name, type, address, lat, lng)
select v.name, v.type, v.address, v.lat, v.lng from (values
  ('Köşe Fırın', 'firin', 'Moda Cd., Kadıköy', 40.9868, 29.0262),
  ('Yeşil Manav', 'manav', 'Bahariye Cd., Kadıköy', 40.9902, 29.0301),
  ('Lezzet Evi', 'restoran', 'Caferağa Mah., Kadıköy', 40.9889, 29.0238)
) as v(name, type, address, lat, lng)
where not exists (select 1 from public.businesses b where b.name = v.name);

insert into public.bag_templates (business_id, title, description, original_price, price, qty, pickup_from, pickup_to)
select b.id, v.title, v.descr, v.orig, v.price, v.qty, v.f::time, v.t::time from (values
  ('Köşe Fırın',  'Ekmek ve Simit Paketi',   'Günün ekmekleri ve simit. Gluten içerir.',        150, 50, 6, '20:00', '22:00'),
  ('Yeşil Manav', 'Sebze ve Meyve Kolisi',   'Mevsim sebze ve meyveleri, karışık koli.',        260, 85, 5, '19:00', '21:30'),
  ('Lezzet Evi',  'Hazır Yemek Paketi',      'Ana yemek, pilav ve salata. Et içerebilir.',      300, 105, 4, '21:00', '23:00')
) as v(bname, title, descr, orig, price, qty, f, t)
join public.businesses b on b.name = v.bname
where not exists (select 1 from public.bag_templates x where x.business_id = b.id and x.title = v.title);

-- 3) Bugünün paketlerini hemen yayınla (sonra her gün 00:05'te cron yayınlar)
select public.publish_template_bags();
