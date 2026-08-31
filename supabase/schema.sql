-- ============================================================
-- DUXITER — DATABASE SCHEMA
-- Run this whole file in the Supabase SQL Editor (once, on a fresh project).
-- Deviations from the original spec are marked with [DUXITER+].
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
do $$ begin
  create type tour_type as enum ('street', 'museum');
exception when duplicate_object then null; end $$;
do $$ begin
  create type tour_status as enum ('draft', 'pending_approval', 'approved', 'rejected');
exception when duplicate_object then null; end $$;
do $$ begin
  create type difficulty_level as enum ('easy', 'medium', 'hard');
exception when duplicate_object then null; end $$;
do $$ begin
  create type app_language as enum ('pt', 'en', 'es');
exception when duplicate_object then null; end $$;
do $$ begin
  create type travel_mode as enum ('walking', 'car');
exception when duplicate_object then null; end $$;
do $$ begin
  create type payment_method_type as enum ('stripe_card', 'pix');
exception when duplicate_object then null; end $$;
do $$ begin
  create type purchase_status as enum ('pending', 'completed', 'refunded', 'expired');
exception when duplicate_object then null; end $$;
do $$ begin
  create type partner_status as enum ('pending', 'active', 'suspended');
exception when duplicate_object then null; end $$;

-- ============================================================
-- CITIES
-- ============================================================
create table if not exists cities (
  id uuid primary key default uuid_generate_v4(),
  slug varchar(80) unique not null,               -- [DUXITER+] used by /cities/[citySlug]
  name jsonb not null,
  description jsonb,
  country varchar(100),
  cover_image_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- TOURS
-- ============================================================
create table if not exists tours (
  id uuid primary key default uuid_generate_v4(),
  city_id uuid references cities(id) on delete cascade,
  title jsonb not null,
  description jsonb,
  short_description jsonb,
  type tour_type not null,
  cover_image_url text,
  difficulty difficulty_level default 'easy',
  estimated_duration_minutes int,
  distance_km decimal(5,2),
  price_usd decimal(8,2) default 0,
  status tour_status default 'draft',
  rejection_reason text,
  tags text[] default '{}',
  is_active boolean default false,
  partner_id uuid,
  view_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- TOUR STOPS
-- ============================================================
create table if not exists tour_stops (
  id uuid primary key default uuid_generate_v4(),
  tour_id uuid references tours(id) on delete cascade,
  order_index int not null,
  title jsonb not null,
  description jsonb,
  audio_url text,
  audio_duration_seconds int,
  latitude decimal(10,8),
  longitude decimal(11,8),
  created_at timestamptz default now(),
  unique(tour_id, order_index)
);

-- ============================================================
-- STOP IMAGES (carousel — max 4 per stop, enforced in the app)
-- ============================================================
create table if not exists stop_images (
  id uuid primary key default uuid_generate_v4(),
  stop_id uuid references tour_stops(id) on delete cascade,
  image_url text not null,
  order_index int default 0,
  caption jsonb,
  created_at timestamptz default now()
);

-- [DUXITER+] Multiple audio segments per stop (play in sequence).
create table if not exists stop_audios (
  id uuid primary key default uuid_generate_v4(),
  stop_id uuid references tour_stops(id) on delete cascade,
  order_index int not null default 0,
  audio_path text not null,
  duration_seconds int,
  label jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_stop_audios_stop on stop_audios(stop_id, order_index);

-- ============================================================
-- USER PROFILES (extends auth.users)
-- ============================================================
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  preferred_language app_language default 'en',
  is_banned boolean default false,                -- [DUXITER+] admin ban flag
  onboarded_at timestamptz,                        -- [DUXITER+] set when the user picks a language
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- PURCHASES
-- ============================================================
create table if not exists purchases (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  tour_id uuid references tours(id),
  amount_paid_usd decimal(8,2),
  amount_paid_brl decimal(10,2),                 -- [DUXITER+] actual charge in BRL
  fx_rate_used decimal(10,4),                     -- [DUXITER+] USD->BRL rate at purchase
  currency varchar(3) default 'brl',             -- [DUXITER+]
  payment_method payment_method_type,
  stripe_payment_intent_id text unique,
  stripe_session_id text,
  discount_code_id uuid,
  discount_amount_usd decimal(8,2) default 0,
  status purchase_status default 'pending',
  expires_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, tour_id)
);

-- ============================================================
-- REVIEWS & REPLIES
-- ============================================================
create table if not exists reviews (
  id uuid primary key default uuid_generate_v4(),
  tour_id uuid references tours(id) on delete cascade,
  user_id uuid references auth.users(id),
  rating int check (rating >= 1 and rating <= 5) not null,
  comment text,
  is_deleted boolean default false,
  deleted_by uuid references auth.users(id),
  deleted_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, tour_id)
);

create table if not exists review_replies (
  id uuid primary key default uuid_generate_v4(),
  review_id uuid references reviews(id) on delete cascade,
  author_id uuid references auth.users(id),
  author_type varchar(10) default 'partner',
  reply_text text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- AI ITINERARIES
-- ============================================================
create table if not exists ai_itineraries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  city_id uuid references cities(id),
  city_name text,
  language app_language,
  travel_mode travel_mode default 'walking',
  available_time_minutes int,
  interests text[],
  generated_stops jsonb,
  is_saved boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- OFFLINE DOWNLOADS
-- ============================================================
create table if not exists offline_downloads (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  tour_id uuid references tours(id),
  downloaded_at timestamptz default now(),
  unique(user_id, tour_id)
);

-- ============================================================
-- DISCOUNT CODES
-- ============================================================
create table if not exists discount_codes (
  id uuid primary key default uuid_generate_v4(),
  code varchar(50) unique not null,
  description text,
  discount_percent int,
  discount_amount_usd decimal(8,2),
  applies_to_tour_id uuid references tours(id),
  max_uses int,
  used_count int default 0,
  expires_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists discount_code_uses (
  id uuid primary key default uuid_generate_v4(),
  code_id uuid references discount_codes(id),
  user_id uuid references auth.users(id),
  purchase_id uuid references purchases(id),
  created_at timestamptz default now()
);

-- ============================================================
-- ADMIN USERS
-- ============================================================
create table if not exists admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  role varchar(20) default 'admin',
  created_at timestamptz default now()
);

-- ============================================================
-- ANALYTICS EVENTS
-- ============================================================
create table if not exists analytics_events (
  id uuid primary key default uuid_generate_v4(),
  event_type varchar(50) not null,
  tour_id uuid references tours(id),
  city_id uuid references cities(id),
  user_id uuid references auth.users(id),
  metadata jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- PARTNERS — PRE-ARCHITECTED, FULLY DISABLED IN V1
-- ============================================================
create table if not exists partners (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  display_name text,
  bio text,
  profile_image_url text,
  website_url text,
  status partner_status default 'pending',
  commission_rate int default 70,
  is_platform_enabled boolean default false,
  created_at timestamptz default now()
);

create table if not exists partner_earnings (
  id uuid primary key default uuid_generate_v4(),
  partner_id uuid references partners(id),
  purchase_id uuid references purchases(id),
  gross_amount_usd decimal(8,2),
  commission_rate int,
  partner_amount_usd decimal(8,2),
  period_month varchar(7),
  payout_status varchar(20) default 'pending',
  paid_at timestamptz,
  admin_notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- [DUXITER+] INDEXES
-- ============================================================
create index if not exists idx_tours_city on tours(city_id);
create index if not exists idx_tours_status_active on tours(status, is_active);
create index if not exists idx_stops_tour on tour_stops(tour_id, order_index);
create index if not exists idx_stop_images_stop on stop_images(stop_id, order_index);
create index if not exists idx_purchases_user on purchases(user_id);
create index if not exists idx_purchases_tour on purchases(tour_id);
create index if not exists idx_reviews_tour on reviews(tour_id) where is_deleted = false;
create index if not exists idx_itineraries_user on ai_itineraries(user_id);
create index if not exists idx_downloads_user on offline_downloads(user_id);
create index if not exists idx_analytics_type_time on analytics_events(event_type, created_at);

-- ============================================================
-- [DUXITER+] updated_at TRIGGER
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_cities_updated on cities;
create trigger trg_cities_updated before update on cities
  for each row execute function set_updated_at();

drop trigger if exists trg_tours_updated on tours;
create trigger trg_tours_updated before update on tours
  for each row execute function set_updated_at();

drop trigger if exists trg_profiles_updated on user_profiles;
create trigger trg_profiles_updated before update on user_profiles
  for each row execute function set_updated_at();

-- ============================================================
-- [DUXITER+] AUTO-CREATE user_profiles ON SIGNUP
-- The onboarding screen later UPDATEs preferred_language.
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists trg_auth_user_created on auth.users;
create trigger trg_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- [DUXITER+] is_admin() HELPER (security definer avoids RLS recursion)
-- ============================================================
create or replace function is_admin(uid uuid default auth.uid())
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from admin_users a where a.id = uid);
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table cities enable row level security;
alter table tours enable row level security;
alter table tour_stops enable row level security;
alter table stop_images enable row level security;
alter table stop_audios enable row level security;
alter table user_profiles enable row level security;
alter table purchases enable row level security;
alter table reviews enable row level security;
alter table review_replies enable row level security;
alter table ai_itineraries enable row level security;
alter table offline_downloads enable row level security;
alter table analytics_events enable row level security;
alter table admin_users enable row level security;
alter table partners enable row level security;

-- ---------- Public read: active content ----------
drop policy if exists "Public: view active cities" on cities;
create policy "Public: view active cities" on cities for select using (is_active = true);

drop policy if exists "Public: view approved tours" on tours;
create policy "Public: view approved tours" on tours for select
  using (status = 'approved' and is_active = true);

drop policy if exists "Public: view stops of approved tours" on tour_stops;
create policy "Public: view stops of approved tours" on tour_stops for select
  using (exists (select 1 from tours t where t.id = tour_id and t.status = 'approved' and t.is_active = true));

drop policy if exists "Public: view stop images" on stop_images;
create policy "Public: view stop images" on stop_images for select using (true);

drop policy if exists "Public: view non-deleted reviews" on reviews;
create policy "Public: view non-deleted reviews" on reviews for select using (is_deleted = false);

drop policy if exists "Public: view review replies" on review_replies;
create policy "Public: view review replies" on review_replies for select using (true);

-- ---------- User: own profile ----------
drop policy if exists "User: read own profile" on user_profiles;
create policy "User: read own profile" on user_profiles for select using (auth.uid() = id);
drop policy if exists "User: update own profile" on user_profiles;
create policy "User: update own profile" on user_profiles for update using (auth.uid() = id);
drop policy if exists "User: insert own profile" on user_profiles;
create policy "User: insert own profile" on user_profiles for insert with check (auth.uid() = id);

-- ---------- User: purchases / itineraries / downloads ----------
drop policy if exists "User: read own purchases" on purchases;
create policy "User: read own purchases" on purchases for select using (auth.uid() = user_id);

drop policy if exists "User: read own itineraries" on ai_itineraries;
create policy "User: read own itineraries" on ai_itineraries for select using (auth.uid() = user_id);
drop policy if exists "User: create itinerary" on ai_itineraries;
create policy "User: create itinerary" on ai_itineraries for insert with check (auth.uid() = user_id);
drop policy if exists "User: update own itinerary" on ai_itineraries;               -- [DUXITER+]
create policy "User: update own itinerary" on ai_itineraries for update using (auth.uid() = user_id);

drop policy if exists "User: read own downloads" on offline_downloads;
create policy "User: read own downloads" on offline_downloads for select using (auth.uid() = user_id);
drop policy if exists "User: add own download" on offline_downloads;                 -- [DUXITER+]
create policy "User: add own download" on offline_downloads for insert with check (auth.uid() = user_id);
drop policy if exists "User: remove own download" on offline_downloads;              -- [DUXITER+]
create policy "User: remove own download" on offline_downloads for delete using (auth.uid() = user_id);

-- ---------- Reviews ----------
drop policy if exists "User: submit review" on reviews;
create policy "User: submit review" on reviews for insert with check (auth.uid() = user_id);
drop policy if exists "User: edit own review" on reviews;                            -- [DUXITER+]
create policy "User: edit own review" on reviews for update
  using (auth.uid() = user_id and is_deleted = false);

-- ---------- Analytics: anyone may write telemetry ----------
drop policy if exists "Anyone: insert analytics" on analytics_events;                -- [DUXITER+]
create policy "Anyone: insert analytics" on analytics_events for insert with check (true);

-- ---------- Admin: read own admin row (needed for admin detection) ----------
drop policy if exists "User: read own admin row" on admin_users;                     -- [DUXITER+]
create policy "User: read own admin row" on admin_users for select using (auth.uid() = id);

-- ---------- Partners: read own row (UI is disabled in V1 but harmless) ----------
drop policy if exists "Partner: read own row" on partners;
create policy "Partner: read own row" on partners for select using (auth.uid() = user_id);

-- ============================================================
-- NOTE: All admin write operations and protected audio streaming
-- run server-side with the SERVICE ROLE key, which bypasses RLS.
-- ============================================================
