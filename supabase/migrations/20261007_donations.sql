-- Bağış: siparişe bağlı bağış tutarı + işletme bağış oranı (canlı veritabanında uygulandı).
-- Not: gerçek bağış toplamak için yetkili bir yardım kuruluşu ve yasal izin gerekir.
alter table public.businesses add column if not exists donation_pct int not null default 0 check (donation_pct between 0 and 100);
alter table public.orders add column if not exists donation_amount numeric not null default 0;
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  user_id uuid references auth.users(id),
  amount numeric not null check (amount >= 0),
  created_at timestamptz not null default now()
);
alter table public.donations enable row level security;
-- add_donation(p_order_id, p_amount), cancel_order ve complete_order canlıda SECURITY DEFINER olarak tanımlıdır.
