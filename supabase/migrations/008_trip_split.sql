-- ============================================================
-- TRIP EXPENSE SPLITTER (Tricount-style, guests need no account)
-- ============================================================

create table if not exists trips (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  emoji varchar(16) not null default '🧳',
  base_currency varchar(3) not null default 'BRL',
  created_by uuid references auth.users(id),
  invite_token varchar(24) unique not null,
  report_token varchar(24) unique not null,
  status varchar(10) not null default 'active',   -- active | closed
  closed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- A person on the trip. user_id is set only for the creator / anyone who
-- happens to be logged in; guests are identified by `secret` (device token).
create table if not exists trip_members (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references trips(id) on delete cascade,
  name text not null,
  user_id uuid references auth.users(id),
  role varchar(10) not null default 'member',      -- owner | member
  secret varchar(32) not null,                     -- guest credential
  claimed boolean not null default false,          -- has someone taken this slot?
  claimed_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_trip_members_trip on trip_members(trip_id);
create index if not exists idx_trip_members_user on trip_members(user_id);

create table if not exists trip_expenses (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references trips(id) on delete cascade,
  title text not null,
  emoji varchar(16) not null default '💸',
  amount numeric(14,2) not null check (amount > 0),
  paid_by uuid not null references trip_members(id),
  split_mode varchar(10) not null default 'equal',  -- equal | exact
  spent_on date not null default current_date,
  note text,
  created_by uuid references trip_members(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_trip_expenses_trip on trip_expenses(trip_id);

create table if not exists trip_expense_shares (
  id uuid primary key default uuid_generate_v4(),
  expense_id uuid not null references trip_expenses(id) on delete cascade,
  member_id uuid not null references trip_members(id) on delete cascade,
  share_amount numeric(14,2) not null check (share_amount >= 0),
  unique (expense_id, member_id)
);
create index if not exists idx_trip_shares_expense on trip_expense_shares(expense_id);

create table if not exists trip_settlements (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references trips(id) on delete cascade,
  from_member uuid not null references trip_members(id),
  to_member uuid not null references trip_members(id),
  amount numeric(14,2) not null check (amount > 0),
  settled_on date not null default current_date,
  note text,
  created_by uuid references trip_members(id),
  created_at timestamptz default now()
);
create index if not exists idx_trip_settlements_trip on trip_settlements(trip_id);

-- RLS on; all access is mediated by API routes (service role) that check
-- session OR the member secret. Same pattern as itinerary_audios / stop_audios.
alter table trips enable row level security;
alter table trip_members enable row level security;
alter table trip_expenses enable row level security;
alter table trip_expense_shares enable row level security;
alter table trip_settlements enable row level security;

drop trigger if exists trg_trips_updated on trips;
create trigger trg_trips_updated before update on trips
  for each row execute function set_updated_at();
drop trigger if exists trg_trip_expenses_updated on trip_expenses;
create trigger trg_trip_expenses_updated before update on trip_expenses
  for each row execute function set_updated_at();
