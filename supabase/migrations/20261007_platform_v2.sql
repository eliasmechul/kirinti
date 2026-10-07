-- Kırıntı v2: sipariş yaşam döngüsü, iptal, yorum/puan, favoriler, tekrarlayan paketler, istatistik.
-- Yalnızca ekleme yapar; mevcut veri silinmez. Ödeme hâlâ simüle (payment_status = 'simule').

-- ---------- Siparişler ----------
do $$ declare c text; begin
  for c in select conname from pg_constraint where conrelid = 'public.orders'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%status%' loop
    execute format('alter table public.orders drop constraint %I', c);
  end loop;
end $$;
alter table public.orders add constraint orders_status_check check (status in ('bekliyor','teslim','iptal','gelmedi'));
alter table public.orders
  add column if not exists cancelled_at timestamptz,
  add column if not exists payment_status text not null default 'simule' check (payment_status in ('simule','odendi','iade')),
  add column if not exists commission_rate numeric not null default 0.30,
  add column if not exists commission_amount numeric,
  add column if not exists payout_amount numeric;
create index if not exists orders_customer_idx on public.orders (customer_id, created_at desc);
create index if not exists orders_bag_idx on public.orders (bag_id);
create index if not exists bags_day_idx on public.bags (pickup_date);
create index if not exists bags_business_idx on public.bags (business_id, pickup_date);

-- ---------- Rezervasyon: süre, tarih, kendi paketi ve adet sınırı kontrolü ----------
create or replace function public.reserve_bag(p_bag_id uuid, p_qty integer)
returns public.orders language plpgsql security definer set search_path = '' as $$
declare
  v_bag public.bags; v_order public.orders; v_uid uuid := auth.uid();
  v_now timestamp := now() at time zone 'Europe/Istanbul';
  v_have int; v_rate numeric := 0.30; v_total numeric; v_comm numeric;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın'; end if;
  if p_qty is null or p_qty < 1 or p_qty > 3 then raise exception 'Geçersiz adet'; end if;
  select * into v_bag from public.bags where id = p_bag_id for update;
  if not found then raise exception 'Paket bulunamadı'; end if;
  if exists (select 1 from public.businesses b where b.id = v_bag.business_id and b.owner_id = v_uid) then
    raise exception 'Kendi paketini ayıramazsın'; end if;
  if v_bag.pickup_date <> v_now::date or v_bag.pickup_to <= v_now::time then
    raise exception 'Bu paketin teslim süresi doldu'; end if;
  if v_bag.qty_available < p_qty then raise exception 'Yeterli paket kalmadı'; end if;
  select coalesce(sum(qty), 0) into v_have from public.orders
    where customer_id = v_uid and bag_id = p_bag_id and status in ('bekliyor','teslim');
  if v_have + p_qty > 3 then raise exception 'Bu paketten en fazla 3 adet alabilirsin'; end if;
  update public.bags set qty_available = qty_available - p_qty where id = p_bag_id;
  v_total := v_bag.price * p_qty; v_comm := round(v_total * v_rate, 2);
  insert into public.orders (bag_id, customer_id, qty, total, code, commission_rate, commission_amount, payout_amount)
  values (p_bag_id, v_uid, p_qty, v_total, lpad((floor(random()*10000))::int::text, 4, '0'), v_rate, v_comm, v_total - v_comm)
  returning * into v_order;
  return v_order;
end $$;

-- ---------- İptal (teslim penceresi başlamadan) ----------
create or replace function public.cancel_order(p_order_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_o public.orders; v_bag public.bags; v_uid uuid := auth.uid(); v_now timestamp := now() at time zone 'Europe/Istanbul';
begin
  if v_uid is null then raise exception 'Giriş yapmalısın'; end if;
  select * into v_o from public.orders where id = p_order_id and customer_id = v_uid for update;
  if not found then raise exception 'Sipariş bulunamadı'; end if;
  if v_o.status <> 'bekliyor' then raise exception 'Bu sipariş iptal edilemez'; end if;
  select * into v_bag from public.bags where id = v_o.bag_id for update;
  if v_bag.pickup_date < v_now::date or (v_bag.pickup_date = v_now::date and v_bag.pickup_from <= v_now::time) then
    raise exception 'Teslim süresi başladı, iptal edilemez'; end if;
  update public.bags set qty_available = qty_available + v_o.qty where id = v_o.bag_id;
  update public.orders set status = 'iptal', cancelled_at = now(), payment_status = 'iade' where id = v_o.id;
  return true;
end $$;

-- Süresi geçen ve teslim alınmayan siparişleri "gelmedi" yapar (cron ile çağrılır)
create or replace function public.expire_orders()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_n int; v_now timestamp := now() at time zone 'Europe/Istanbul';
begin
  update public.orders o set status = 'gelmedi'
  from public.bags g
  where g.id = o.bag_id and o.status = 'bekliyor'
    and (g.pickup_date < v_now::date or (g.pickup_date = v_now::date and g.pickup_to < v_now::time));
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- ---------- Yorum ve puan ----------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists reviews_business_idx on public.reviews (business_id, created_at desc);
create index if not exists reviews_customer_idx on public.reviews (customer_id);
alter table public.reviews enable row level security;
create policy "yorumlar herkese açık" on public.reviews for select using (true);

create or replace function public.rate_order(p_order_id uuid, p_rating int, p_comment text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_o public.orders; v_biz uuid; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Giriş yapmalısın'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'Puan 1-5 arası olmalı'; end if;
  select * into v_o from public.orders where id = p_order_id and customer_id = v_uid;
  if not found or v_o.status <> 'teslim' then raise exception 'Yalnızca teslim aldığın siparişi puanlayabilirsin'; end if;
  select g.business_id into v_biz from public.bags g where g.id = v_o.bag_id;
  insert into public.reviews (order_id, business_id, customer_id, rating, comment)
  values (p_order_id, v_biz, v_uid, p_rating, nullif(trim(p_comment), ''))
  on conflict (order_id) do update set rating = excluded.rating, comment = excluded.comment;
  return true;
end $$;

create or replace view public.business_ratings with (security_invoker = true) as
  select business_id, round(avg(rating)::numeric, 1) as avg_rating, count(*)::int as n
  from public.reviews group by business_id;
grant select on public.business_ratings to anon, authenticated;

-- ---------- Favoriler (hesaba bağlı) ----------
create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, business_id)
);
create index if not exists favorites_business_idx on public.favorites (business_id);
alter table public.favorites enable row level security;
create policy "favori: kendini gör" on public.favorites for select using (user_id = (select auth.uid()));
create policy "favori: kendin ekle" on public.favorites for insert with check (user_id = (select auth.uid()));
create policy "favori: kendin sil" on public.favorites for delete using (user_id = (select auth.uid()));

-- ---------- Tekrarlayan paketler (şablon) ----------
create table if not exists public.bag_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 100),
  description text check (char_length(description) <= 300),
  original_price numeric not null check (original_price > 0),
  price numeric not null check (price > 0 and price < original_price),
  qty integer not null check (qty between 1 and 50),
  pickup_from time not null,
  pickup_to time not null check (pickup_to > pickup_from),
  weekdays int[] not null default '{1,2,3,4,5,6,7}',
  active boolean not null default true,
  photo_url text,
  created_at timestamptz not null default now()
);
create index if not exists bag_templates_business_idx on public.bag_templates (business_id);
alter table public.bag_templates enable row level security;
create policy "sablon: sahibi okur" on public.bag_templates for select
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));
create policy "sablon: sahibi ekler" on public.bag_templates for insert
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));
create policy "sablon: sahibi günceller" on public.bag_templates for update
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));
create policy "sablon: sahibi siler" on public.bag_templates for delete
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));

-- Bugünün paketlerini şablonlardan üretir (aynı başlıklı paket varsa üretmez)
create or replace function public.publish_template_bags(p_business uuid default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_n int; v_now timestamp := now() at time zone 'Europe/Istanbul';
begin
  insert into public.bags (business_id, title, description, original_price, price, qty_available, pickup_date, pickup_from, pickup_to, photo_url)
  select t.business_id, t.title, t.description, t.original_price, t.price, t.qty, v_now::date, t.pickup_from, t.pickup_to, t.photo_url
  from public.bag_templates t
  where t.active and extract(isodow from v_now)::int = any (t.weekdays)
    and (p_business is null or t.business_id = p_business)
    and t.pickup_to > v_now::time
    and not exists (select 1 from public.bags b where b.business_id = t.business_id and b.title = t.title and b.pickup_date = v_now::date);
  get diagnostics v_n = row_count;
  return v_n;
end $$;

create or replace function public.publish_my_templates()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_biz uuid; v_n int := 0;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın'; end if;
  for v_biz in select id from public.businesses where owner_id = v_uid loop
    v_n := v_n + public.publish_template_bags(v_biz);
  end loop;
  return v_n;
end $$;

-- ---------- İşletme istatistikleri ----------
create or replace function public.business_stats(p_business uuid)
returns json language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_today date := (now() at time zone 'Europe/Istanbul')::date; r json;
begin
  if not exists (select 1 from public.businesses where id = p_business and owner_id = v_uid) then
    raise exception 'Yetkin yok'; end if;
  select json_build_object(
    'today_orders', count(*) filter (where g.pickup_date = v_today and o.status in ('bekliyor','teslim')),
    'today_delivered', count(*) filter (where g.pickup_date = v_today and o.status = 'teslim'),
    'today_revenue', coalesce(sum(o.payout_amount) filter (where g.pickup_date = v_today and o.status = 'teslim'), 0),
    'total_meals', coalesce(sum(o.qty) filter (where o.status = 'teslim'), 0),
    'total_revenue', coalesce(sum(o.payout_amount) filter (where o.status = 'teslim'), 0),
    'no_shows', count(*) filter (where o.status = 'gelmedi'),
    'avg_rating', (select round(avg(rating)::numeric, 1) from public.reviews where business_id = p_business),
    'reviews', (select count(*) from public.reviews where business_id = p_business)
  ) into r
  from public.orders o join public.bags g on g.id = o.bag_id where g.business_id = p_business;
  return r;
end $$;

-- ---------- Yetkiler: zamanlanmış işler yalnızca sunucuda çalışır ----------
revoke execute on function public.expire_orders() from public, anon, authenticated;
revoke execute on function public.publish_template_bags(uuid) from public, anon, authenticated;
revoke execute on function public.reserve_bag(uuid, integer) from public, anon;
revoke execute on function public.cancel_order(uuid) from public, anon;
revoke execute on function public.rate_order(uuid, int, text) from public, anon;
revoke execute on function public.publish_my_templates() from public, anon;
revoke execute on function public.business_stats(uuid) from public, anon;
revoke execute on function public.complete_order(uuid, text) from public, anon;
grant execute on function public.reserve_bag(uuid, integer), public.cancel_order(uuid), public.rate_order(uuid, int, text),
  public.publish_my_templates(), public.business_stats(uuid), public.complete_order(uuid, text) to authenticated;
