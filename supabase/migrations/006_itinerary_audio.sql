-- ============================================================
-- AI ITINERARY: generated voice narration + generation quota
-- ============================================================

-- One synthesized audio clip per itinerary stop (kind='stop').
-- 'intro' / 'to_next' reserved for a later phase.
create table if not exists itinerary_audios (
  id uuid primary key default uuid_generate_v4(),
  itinerary_id uuid not null references ai_itineraries(id) on delete cascade,
  stop_index int not null,
  kind varchar(12) not null default 'stop',
  audio_path text,
  audio_url text,
  duration_seconds numeric,
  voice varchar(40),
  char_count int,
  status varchar(12) not null default 'pending',   -- pending | ready | failed
  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (itinerary_id, stop_index, kind)
);

create index if not exists idx_itinerary_audios_itin
  on itinerary_audios(itinerary_id);

alter table itinerary_audios enable row level security;
-- No policies: only the service-role client (API routes) touches this table.
-- API routes gate access in code (itinerary is viewable by link, so is its audio).

drop trigger if exists trg_itinerary_audios_updated on itinerary_audios;
create trigger trg_itinerary_audios_updated before update on itinerary_audios
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- Generation quota: 1 free AI itinerary per day, extra via paid credits.
-- (Phase 1 only reads balance; the paid top-up lands in a later migration.)
-- ------------------------------------------------------------
create table if not exists itinerary_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance int not null default 0,
  lifetime_purchased int not null default 0,
  updated_at timestamptz default now()
);

alter table itinerary_credits enable row level security;

drop policy if exists "own credits: read" on itinerary_credits;
create policy "own credits: read" on itinerary_credits
  for select using (auth.uid() = user_id);

drop trigger if exists trg_itinerary_credits_updated on itinerary_credits;
create trigger trg_itinerary_credits_updated before update on itinerary_credits
  for each row execute function set_updated_at();
