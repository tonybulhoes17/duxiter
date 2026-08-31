-- ============================================================
-- DUXITER — Migration 002: payments
-- Run in the Supabase SQL Editor (after schema.sql / seed.sql).
-- Safe to re-run.
-- ============================================================

-- Record the BRL amount actually charged + the FX rate used, alongside
-- the canonical USD catalogue price.
alter table purchases
  add column if not exists amount_paid_brl decimal(10,2),
  add column if not exists fx_rate_used decimal(10,4),
  add column if not exists currency varchar(3) default 'brl';

-- Stripe Checkout Sessions can be looked up by id on the success page.
create index if not exists idx_purchases_session on purchases(stripe_session_id);
create index if not exists idx_purchases_status on purchases(status);

-- discount_code_uses: guard against the same code being counted twice
-- for one purchase.
create unique index if not exists uq_code_use_per_purchase
  on discount_code_uses(code_id, purchase_id);

-- Atomic increment of a discount code's usage counter.
create or replace function increment_discount_use(p_code_id uuid)
returns void language sql security definer set search_path = public as $$
  update discount_codes set used_count = used_count + 1 where id = p_code_id;
$$;
