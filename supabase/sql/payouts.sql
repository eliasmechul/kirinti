-- Hakediş (Too Good To Go modeli): müşteri Kırıntı'ya öder, Kırıntı komisyonu keser,
-- işletmeye net tutar dönemsel olarak banka havalesiyle (EFT) ödenir ve ekstre gösterilir.

create table if not exists public.payout_details (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  holder text not null check (length(trim(holder)) between 3 and 120),
  iban text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  period_end date not null,
  orders_count int not null,
  card_net numeric(10,2) not null,        -- kartla ödenen siparişlerde işletmeye düşen tutar
  cash_commission numeric(10,2) not null, -- mekânda ödenen siparişlerde işletmenin bize borçlu olduğu komisyon
  net numeric(10,2) not null,             -- card_net - cash_commission
  status text not null default 'hazir' check (status in ('hazir','odendi')),
  reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.orders add column if not exists payout_id uuid references public.payouts(id);
create index if not exists orders_payout_idx on public.orders(payout_id);

alter table public.payout_details enable row level security;
alter table public.payouts enable row level security;

drop policy if exists payout_details_owner_read on public.payout_details;
create policy payout_details_owner_read on public.payout_details for select to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
drop policy if exists payouts_owner_read on public.payouts;
create policy payouts_owner_read on public.payouts for select to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
-- yazma yalnızca aşağıdaki fonksiyonlarla

create or replace function public.valid_tr_iban(p text) returns boolean
language plpgsql immutable as $$
declare s text := upper(regexp_replace(p, '\s', '', 'g')); r text; rem bigint := 0; ch text; i int;
begin
  if s !~ '^TR[0-9]{24}$' then return false; end if;
  r := substr(s, 5) || substr(s, 1, 4);
  r := replace(r, 'T', '29'); r := replace(r, 'R', '27');
  for i in 1..length(r) loop
    ch := substr(r, i, 1);
    rem := (rem * 10 + ch::int) % 97;
  end loop;
  return rem = 1;
end $$;

create or replace function public.save_payout_details(p_business uuid, p_holder text, p_iban text)
returns void language plpgsql security definer set search_path = public as $$
declare v text := upper(regexp_replace(p_iban, '\s', '', 'g'));
begin
  if not exists (select 1 from businesses where id = p_business and owner_id = auth.uid()) then
    raise exception 'Yetkisiz';
  end if;
  if not valid_tr_iban(v) then raise exception 'IBAN geçersiz'; end if;
  insert into payout_details(business_id, holder, iban) values (p_business, trim(p_holder), v)
  on conflict (business_id) do update set holder = excluded.holder, iban = excluded.iban, updated_at = now();
end $$;

-- Ödenmeye hazır (henüz bir hakedişe bağlanmamış) teslim edilmiş siparişler
create or replace view public.payable_orders as
select o.id, b.business_id,
  case when o.payment_method = 'kart' then coalesce(o.payout_amount, 0) else 0 end as card_net,
  case when o.payment_method = 'kart' then 0
       else coalesce(o.commission_amount, round(o.total * coalesce(o.commission_rate, 0.30), 2)) end as cash_commission,
  b.pickup_date
from public.orders o join public.bags b on b.id = o.bag_id
where o.status = 'teslim' and o.payment_status = 'odendi' and o.payout_id is null;
alter view public.payable_orders set (security_invoker = on);
revoke all on public.payable_orders from anon, authenticated;

create or replace function public.my_payout_summary(p_business uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare pend record; det record; pays jsonb;
begin
  if not exists (select 1 from businesses where id = p_business and owner_id = auth.uid()) then
    raise exception 'Yetkisiz';
  end if;
  select count(*) n, coalesce(sum(card_net),0) cn, coalesce(sum(cash_commission),0) cc into pend
    from payable_orders where business_id = p_business;
  select holder, iban into det from payout_details where business_id = p_business;
  select coalesce(jsonb_agg(jsonb_build_object('period_end', period_end, 'orders', orders_count, 'net', net, 'status', status, 'paid_at', paid_at, 'reference', reference) order by created_at desc), '[]')
    into pays from (select * from payouts where business_id = p_business order by created_at desc limit 12) x;
  return jsonb_build_object(
    'pending_orders', pend.n, 'pending_card_net', pend.cn, 'pending_cash_commission', pend.cc, 'pending_net', pend.cn - pend.cc,
    'holder', det.holder, 'iban_masked', case when det.iban is null then null else substr(det.iban,1,4) || ' •••• •••• •••• ' || right(det.iban,4) end,
    'payouts', pays);
end $$;

-- Dönem sonunda Kırıntı tarafından çalıştırılır (kullanıcılara kapalı). Net tutar negatifse (işletme bize borçluysa) bir sonraki döneme devreder.
create or replace function public.create_payouts(p_end date)
returns int language plpgsql security definer set search_path = public as $$
declare r record; pid uuid; n int := 0;
begin
  for r in
    select business_id, count(*) cnt, sum(card_net) cn, sum(cash_commission) cc
    from payable_orders where pickup_date <= p_end group by business_id
    having sum(card_net) - sum(cash_commission) > 0
  loop
    if not exists (select 1 from payout_details where business_id = r.business_id) then continue; end if;
    insert into payouts(business_id, period_end, orders_count, card_net, cash_commission, net)
      values (r.business_id, p_end, r.cnt, r.cn, r.cc, r.cn - r.cc) returning id into pid;
    update orders set payout_id = pid where id in (select id from payable_orders where business_id = r.business_id and pickup_date <= p_end);
    n := n + 1;
  end loop;
  return n;
end $$;

revoke all on function public.create_payouts(date) from public, anon, authenticated;
grant execute on function public.create_payouts(date) to service_role;
revoke all on function public.save_payout_details(uuid, text, text) from public, anon;
grant execute on function public.save_payout_details(uuid, text, text) to authenticated;
revoke all on function public.my_payout_summary(uuid) from public, anon;
grant execute on function public.my_payout_summary(uuid) to authenticated;
