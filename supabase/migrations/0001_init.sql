-- HisaabKitaab - Phase 2.0 cloud schema (Supabase / Postgres)
-- Paste into Supabase -> SQL Editor -> Run. Safe to re-run (idempotent-ish).
--
-- Design notes:
-- * Every user owns one or more `lists`; items/entries/cycles hang off a list via
--   list_id, so Phase 2.1 sharing becomes an RLS + members change, not a reshape.
-- * Every row carries updated_at + deleted (soft delete) to drive last-write-wins
--   sync with the local cache.
-- * Row-Level Security restricts all access to lists the caller owns (2.0). In 2.1
--   the owns_list() helper is extended to also honour list membership.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- lists
-- ---------------------------------------------------------------------------
create table if not exists lists (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  name         text not null default 'My list',
  currency     text not null default 'INR',
  cycle_type   text not null default 'monthly',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted      boolean not null default false
);
create index if not exists idx_lists_owner on lists(owner_id);

-- owns_list(): true if the caller may access rows on this list.
-- Phase 2.0 = ownership only. Phase 2.1 will OR-in list_members membership.
create or replace function owns_list(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from lists l where l.id = target and l.owner_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- items
-- ---------------------------------------------------------------------------
create table if not exists items (
  id           uuid primary key default gen_random_uuid(),
  list_id      uuid not null references lists(id) on delete cascade,
  name         text not null,
  unit         text not null,
  custom_unit  text,
  color_hex    text not null,
  default_qty  double precision not null default 1,
  reminder     boolean not null default true,
  archived     boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted      boolean not null default false
);
create index if not exists idx_items_list on items(list_id);

-- ---------------------------------------------------------------------------
-- price_versions
-- ---------------------------------------------------------------------------
create table if not exists price_versions (
  id             uuid primary key default gen_random_uuid(),
  item_id        uuid not null references items(id) on delete cascade,
  list_id        uuid not null references lists(id) on delete cascade,
  price_per_unit double precision not null,
  effective_from date not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted        boolean not null default false
);
create index if not exists idx_price_item on price_versions(item_id, effective_from);

-- ---------------------------------------------------------------------------
-- cycles  (one per list per calendar period)
-- ---------------------------------------------------------------------------
create table if not exists cycles (
  id           uuid primary key default gen_random_uuid(),
  list_id      uuid not null references lists(id) on delete cascade,
  period       text not null,               -- 'YYYY-MM'
  label        text not null,
  start_date   date not null,
  end_date     date not null,
  status       text not null default 'open',
  grand_total  double precision,
  generated_at timestamptz,
  updated_at   timestamptz not null default now(),
  deleted      boolean not null default false,
  unique (list_id, period)
);
create index if not exists idx_cycles_list on cycles(list_id);

-- ---------------------------------------------------------------------------
-- entries
-- ---------------------------------------------------------------------------
create table if not exists entries (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references items(id) on delete cascade,
  list_id     uuid not null references lists(id) on delete cascade,
  quantity    double precision not null,
  day         date not null,
  logged_at   timestamptz not null default now(),
  period      text not null,                -- owning cycle period 'YYYY-MM'
  note        text,
  created_by  uuid references auth.users(id),   -- attribution (2.1)
  updated_at  timestamptz not null default now(),
  deleted     boolean not null default false
);
create index if not exists idx_entries_list_period on entries(list_id, period);
create index if not exists idx_entries_item_day on entries(item_id, day);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['lists','items','price_versions','cycles','entries'] loop
    execute format('drop trigger if exists trg_%s_updated on %I', t, t);
    execute format('create trigger trg_%s_updated before update on %I
                    for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
alter table lists          enable row level security;
alter table items          enable row level security;
alter table price_versions enable row level security;
alter table cycles         enable row level security;
alter table entries        enable row level security;

-- lists: owner-scoped
drop policy if exists lists_rw on lists;
create policy lists_rw on lists
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- child tables: access follows list ownership
drop policy if exists items_rw on items;
create policy items_rw on items
  using (owns_list(list_id)) with check (owns_list(list_id));

drop policy if exists price_versions_rw on price_versions;
create policy price_versions_rw on price_versions
  using (owns_list(list_id)) with check (owns_list(list_id));

drop policy if exists cycles_rw on cycles;
create policy cycles_rw on cycles
  using (owns_list(list_id)) with check (owns_list(list_id));

drop policy if exists entries_rw on entries;
create policy entries_rw on entries
  using (owns_list(list_id)) with check (owns_list(list_id));
