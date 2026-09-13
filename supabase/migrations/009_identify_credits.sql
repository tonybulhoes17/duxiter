-- Photo identification: separate credit wallet from itinerary_credits.
-- 2 free identifications/day (enforced in the API by counting identify_usage),
-- then paid credits from this table. Mirrors 006/007's itinerary_credits pattern.

create table if not exists identify_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance int not null default 0,
  lifetime_purchased int not null default 0,
  updated_at timestamptz not null default now()
);

alter table identify_credits enable row level security;

create policy "own identify credits: read" on identify_credits
  for select using (auth.uid() = user_id);

-- one row per identification attempt (successful API response, whether or
-- not the subject was actually identified) — used to count today's free uses.
create table if not exists identify_usage (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  identified boolean,
  created_at timestamptz not null default now()
);

alter table identify_usage enable row level security;

create policy "own identify usage: read" on identify_usage
  for select using (auth.uid() = user_id);

create index if not exists idx_identify_usage_user_day
  on identify_usage (user_id, created_at);

create table if not exists identify_credit_orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id),
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  credits int not null,
  amount_brl numeric(10, 2) not null,
  status varchar(20) not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table identify_credit_orders enable row level security;

create or replace function add_identify_credits(p_user uuid, p_credits int)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into identify_credits (user_id, balance, lifetime_purchased)
  values (p_user, p_credits, p_credits)
  on conflict (user_id) do update
    set balance = identify_credits.balance + p_credits,
        lifetime_purchased = identify_credits.lifetime_purchased + p_credits,
        updated_at = now();
end;
$$;
