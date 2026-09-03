-- ============================================================
-- AI ITINERARY: paid credit pack (Stripe one-time purchase)
-- ============================================================

create table if not exists itinerary_credit_orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  credits int not null,
  amount_brl numeric,
  status varchar(12) not null default 'pending',  -- pending | completed | expired | refunded
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_itin_credit_orders_user
  on itinerary_credit_orders(user_id);

alter table itinerary_credit_orders enable row level security;

drop policy if exists "own credit orders: read" on itinerary_credit_orders;
create policy "own credit orders: read" on itinerary_credit_orders
  for select using (auth.uid() = user_id);

drop trigger if exists trg_itin_credit_orders_updated on itinerary_credit_orders;
create trigger trg_itin_credit_orders_updated before update on itinerary_credit_orders
  for each row execute function set_updated_at();

-- Atomic top-up (credits never expire).
create or replace function add_itinerary_credits(p_user uuid, p_credits int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into itinerary_credits (user_id, balance, lifetime_purchased)
  values (p_user, p_credits, p_credits)
  on conflict (user_id) do update
    set balance = itinerary_credits.balance + p_credits,
        lifetime_purchased = itinerary_credits.lifetime_purchased + p_credits,
        updated_at = now();
end;
$$;
