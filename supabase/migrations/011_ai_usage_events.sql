-- Cost/usage ledger for every paid-API call the app makes (OpenAI text +
-- vision + TTS). This is separate from `analytics_events` (behavioural
-- funnel events) and from `identify_usage` (billing record for photo ID) —
-- this table exists purely so real per-request cost is known instead of
-- estimated. Service-role only, same access pattern as itinerary_audios.

create table if not exists ai_usage_events (
  id uuid primary key default uuid_generate_v4(),
  event_type varchar(30) not null, -- itinerary_generate | itinerary_expand | itinerary_tts | identify | identify_tts | translate
  user_id uuid references auth.users(id) on delete set null,
  model varchar(40),
  input_tokens int,
  output_tokens int,
  chars int,
  cost_usd numeric(10, 6) not null default 0,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table ai_usage_events enable row level security;

create index if not exists idx_ai_usage_events_type_day
  on ai_usage_events (event_type, created_at);
create index if not exists idx_ai_usage_events_user
  on ai_usage_events (user_id, created_at);
