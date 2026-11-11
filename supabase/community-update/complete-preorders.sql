-- ccproj community update (Preordini tab): completion script.
-- Turns fully funded preorder items into confirmed (bought) items.
--
-- HOW TO RUN
--   Run this in the Supabase dashboard > SQL Editor (paste the statement below and press Run).
--   It must NOT be run from the website: the public anon key is read-only (RLS + revoked
--   write privileges), only the SQL Editor / Table Editor have write access.
--   Prerequisite: supabase/community-update/schema.sql (and seed.sql) already applied.
--   Run it after you have updated `current_progress` by hand following the payments received.
--
-- WHAT IT DOES (one single SQL statement = one atomic transaction: all changes or none)
--   1. Picks active preorder_items with current_progress = required_progress and quantity > 0
--      (rows are locked with FOR UPDATE so a concurrent edit cannot interleave).
--   2. Upserts one bought_items row per picked item with the deterministic id
--      'bought-' || <preorder id>: created with quantity 1, or quantity + 1 if it already exists.
--      name, category_id, full price_cents, image_path, description and source_item_id are
--      copied from the preorder item (refreshed on every completion). `active` and
--      `sort_order` of an existing bought row are left as they are.
--   3. Subtracts 1 from the preorder item's quantity and resets current_progress to 0.
--
-- GUARANTEES
--   * Each item completes at most once per run. If a restocked item is already full again,
--     run the script once more.
--   * Nothing complete = nothing changes (the result is simply an empty list).
--   * Safe to re-run: right after a run the completed items have current_progress = 0,
--     so they are not picked up again.
--
-- RESULT
--   One row per item moved: preorder_id, bought_id, name, price_cents,
--   preorder_quantity_left (preorder quantity after the run) and
--   bought_quantity (total confirmed quantity after the run).

with due as (
  select id, name, category_id, price_cents, image_path, description, sort_order
  from public.preorder_items
  where active = true
    and current_progress = required_progress
    and quantity > 0
  for update
),
bought as (
  insert into public.bought_items
    (id, source_item_id, name, category_id, price_cents, image_path, description, quantity, active, sort_order)
  select
    'bought-' || due.id, due.id, due.name, due.category_id, due.price_cents,
    due.image_path, due.description, 1, true, due.sort_order
  from due
  on conflict (id) do update set
    quantity       = public.bought_items.quantity + 1,
    source_item_id = excluded.source_item_id,
    name           = excluded.name,
    category_id    = excluded.category_id,
    price_cents    = excluded.price_cents,
    image_path     = excluded.image_path,
    description    = excluded.description
  returning id, source_item_id, quantity
),
reset as (
  update public.preorder_items p
  set quantity         = p.quantity - 1,
      current_progress = 0
  from due
  where p.id = due.id
  returning p.id, p.name, p.price_cents, p.quantity
)
select
  reset.id         as preorder_id,
  bought.id        as bought_id,
  reset.name,
  reset.price_cents,
  reset.quantity   as preorder_quantity_left,
  bought.quantity  as bought_quantity
from reset
join bought on bought.source_item_id = reset.id
order by reset.id;
