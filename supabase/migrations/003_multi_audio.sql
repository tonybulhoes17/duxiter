-- ============================================================
-- DUXITER — Migration 003: multiple audio segments per stop
-- Run in the Supabase SQL Editor. Safe to re-run.
-- ============================================================

create table if not exists stop_audios (
  id uuid primary key default uuid_generate_v4(),
  stop_id uuid references tour_stops(id) on delete cascade,
  order_index int not null default 0,
  audio_path text not null,            -- path inside the private duxiter-audio bucket
  duration_seconds int,
  label jsonb,                         -- optional {"pt":"Parte 1", ...}
  created_at timestamptz default now()
);

create index if not exists idx_stop_audios_stop on stop_audios(stop_id, order_index);

alter table stop_audios enable row level security;
-- No public policy: audio paths are private and streamed only via
-- /api/audio/segment/[id] (service role) after a paywall check.

-- Migrate the existing single-file audio into segment #0.
insert into stop_audios (stop_id, order_index, audio_path, duration_seconds)
select ts.id, 0, ts.audio_url, ts.audio_duration_seconds
from tour_stops ts
where ts.audio_url is not null
  and not exists (select 1 from stop_audios sa where sa.stop_id = ts.id);

-- tour_stops.audio_url / audio_duration_seconds are kept for backward
-- compatibility but are no longer written by the app.
