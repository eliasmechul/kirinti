-- Ödeme yöntemi: sipariş hangi yöntemle ödendi (şimdilik hepsi test modunda, gerçek tahsilat yok).
alter table public.orders
  add column if not exists payment_method text not null default 'kart'
  check (payment_method in ('kart','paypal','applepay','googlepay'));

drop function if exists public.reserve_bag(uuid, integer);
create function public.reserve_bag(p_bag_id uuid, p_qty integer, p_method text default 'kart')
returns public.orders language plpgsql security definer set search_path = '' as $$
declare
  v_bag public.bags; v_order public.orders; v_uid uuid := auth.uid();
  v_now timestamp := now() at time zone 'Europe/Istanbul';
  v_have int; v_rate numeric := 0.30; v_total numeric; v_comm numeric;
begin
  if v_uid is null then raise exception 'Giriş yapmalısın'; end if;
  if p_qty is null or p_qty < 1 or p_qty > 3 then raise exception 'Geçersiz adet'; end if;
  if p_method is null or p_method not in ('kart','paypal','applepay','googlepay') then raise exception 'Geçersiz ödeme yöntemi'; end if;
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
  insert into public.orders (bag_id, customer_id, qty, total, code, commission_rate, commission_amount, payout_amount, payment_method)
  values (p_bag_id, v_uid, p_qty, v_total, lpad((floor(random()*10000))::int::text, 4, '0'), v_rate, v_comm, v_total - v_comm, p_method)
  returning * into v_order;
  return v_order;
end $$;

revoke execute on function public.reserve_bag(uuid, integer, text) from public, anon;
grant execute on function public.reserve_bag(uuid, integer, text) to authenticated;
