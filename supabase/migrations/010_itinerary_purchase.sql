-- AI itineraries move from "1 free/day + credit pack" to pay-per-itinerary:
-- generation itself is always free, but only the first stop (ITINERARY_FREE_STOPS)
-- is unlocked until the traveller pays once for that specific itinerary.
-- Lifetime access once purchased — no expiry, unlike tour purchases.

create table if not exists itinerary_purchases (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id),
  itinerary_id uuid not null references ai_itineraries(id) on delete cascade,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  amount_paid_brl numeric(10, 2),
  fx_rate_used numeric(10, 4),
  status varchar(20) not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, itinerary_id)
);

alter table itinerary_purchases enable row level security;

create policy "own itinerary purchases: read" on itinerary_purchases
  for select using (auth.uid() = user_id);

create index if not exists idx_itinerary_purchases_lookup
  on itinerary_purchases (user_id, itinerary_id);
