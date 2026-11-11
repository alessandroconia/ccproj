-- ccproj community update (Preordini tab) schema. Run in the Supabase SQL Editor (safe to re-run).
-- RUN ORDER: run the existing supabase/schema.sql and supabase/seed.sql FIRST
-- (this file reuses their `categories` table and the `item-images` bucket),
-- then this file, then supabase/community-update/seed.sql.
-- Security model is the same as the Negozio tables: visitors use the public anon key,
-- which can only READ active rows. RLS is enabled with no write policies, and write
-- privileges are also revoked as a second layer.

-- Items the community pools small contributions ("steps") towards.
-- Step price (computed by the app, not stored): ceil(price_cents / required_progress).
-- Open for contributions only when quantity > 0 and current_progress < required_progress.
create table if not exists public.preorder_items (
  id                text primary key,
  name              text not null,
  category_id       text not null references public.categories (id) on update cascade on delete restrict,
  price_cents       integer not null check (price_cents >= 0),
  image_path        text,
  description       text,
  quantity          integer not null default 0 check (quantity >= 0),
  current_progress  integer not null default 0,
  required_progress integer not null check (required_progress between 2 and 6),
  active            boolean not null default true,
  sort_order        integer not null default 0,
  constraint preorder_items_progress_check
    check (current_progress >= 0 and current_progress <= required_progress)
);

-- Confirmed (bought) items: display only. quantity is informative.
-- source_item_id is the preorder item the row came from; kept as NULL if that item is deleted.
create table if not exists public.bought_items (
  id             text primary key,
  source_item_id text references public.preorder_items (id) on update cascade on delete set null,
  name           text not null,
  category_id    text not null references public.categories (id) on update cascade on delete restrict,
  price_cents    integer not null check (price_cents >= 0),
  image_path     text,
  description    text,
  quantity       integer not null default 1 check (quantity >= 0),
  active         boolean not null default true,
  sort_order     integer not null default 0
);

create index if not exists preorder_items_category_id_idx on public.preorder_items (category_id);
create index if not exists bought_items_category_id_idx   on public.bought_items (category_id);

-- Row Level Security: read-only for the public.
alter table public.preorder_items enable row level security;
alter table public.bought_items   enable row level security;

drop policy if exists "Public can read active preorder items" on public.preorder_items;
create policy "Public can read active preorder items"
  on public.preorder_items for select
  to anon, authenticated
  using (active = true);

drop policy if exists "Public can read active bought items" on public.bought_items;
create policy "Public can read active bought items"
  on public.bought_items for select
  to anon, authenticated
  using (active = true);

-- Second layer: no write privileges for public roles at all.
revoke insert, update, delete, truncate on public.preorder_items from anon, authenticated;
revoke insert, update, delete, truncate on public.bought_items   from anon, authenticated;
