-- ccproj catalog schema. Run once in the Supabase SQL Editor (safe to re-run).
-- Security model: visitors use the public anon key, which can only READ.
-- Row Level Security is enabled and there are no write policies; write
-- privileges are also revoked as a second layer.

create table if not exists public.categories (
  id         text primary key,
  name       text not null,
  sort_order integer not null default 0
);

create table if not exists public.items (
  id          text primary key,
  name        text not null,
  category_id text not null references public.categories (id) on update cascade on delete restrict,
  price_cents integer not null check (price_cents >= 0),
  image_path  text,
  description text,
  active      boolean not null default true,
  sort_order  integer not null default 0
);

create index if not exists items_category_id_idx on public.items (category_id);

-- Row Level Security: read-only for the public.
alter table public.categories enable row level security;
alter table public.items      enable row level security;

drop policy if exists "Public can read categories" on public.categories;
create policy "Public can read categories"
  on public.categories for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can read active items" on public.items;
create policy "Public can read active items"
  on public.items for select
  to anon, authenticated
  using (active = true);

-- Second layer: no write privileges for public roles at all.
revoke insert, update, delete, truncate on public.categories from anon, authenticated;
revoke insert, update, delete, truncate on public.items      from anon, authenticated;

-- Public bucket for item images (objects are readable by URL).
-- No upload policy is created, so anon cannot upload; add images via the dashboard.
insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do update set public = true;
