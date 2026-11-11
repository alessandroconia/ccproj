-- Vague example preorder items mirroring the six example articles in supabase/seed.sql.
-- RUN ORDER: supabase/schema.sql, supabase/seed.sql, supabase/community-update/schema.sql, then this file (safe to re-run).
-- Categories come from supabase/seed.sql (category-a/b/c); this file does not touch them.
-- quantity and current_progress start at 0, so nothing can be contributed to until you set real values
-- in the Supabase Table Editor. Re-running this file never overwrites quantity or current_progress.
-- No bought_items rows are seeded: they are created by the completion script.
--
-- Step prices (ceil(price_cents / required_progress)):
--   item-01: 2400 / 4 = 600 (6,00 EUR)   <- worked example
--   item-02: 1600 / 6 = 267 (2,67 EUR)
--   item-03: 3200 / 2 = 1600 (16,00 EUR)
--   item-04: 2800 / 5 = 560 (5,60 EUR)
--   item-05: 2000 / 3 = 667 (6,67 EUR)
--   item-06: 3600 / 6 = 600 (6,00 EUR)

insert into public.preorder_items (id, name, category_id, price_cents, image_path, description, quantity, current_progress, required_progress, active, sort_order) values
  ('preorder-01', 'Articolo 01', 'category-a', 2400, null, null, 0, 0, 4, true, 1),
  ('preorder-02', 'Articolo 02', 'category-a', 1600, null, null, 0, 0, 6, true, 2),
  ('preorder-03', 'Articolo 03', 'category-b', 3200, null, null, 0, 0, 2, true, 3),
  ('preorder-04', 'Articolo 04', 'category-b', 2800, null, null, 0, 0, 5, true, 4),
  ('preorder-05', 'Articolo 05', 'category-c', 2000, null, null, 0, 0, 3, true, 5),
  ('preorder-06', 'Articolo 06', 'category-c', 3600, null, null, 0, 0, 6, true, 6)
on conflict (id) do update
  set name = excluded.name,
      category_id = excluded.category_id,
      price_cents = excluded.price_cents,
      image_path = excluded.image_path,
      description = excluded.description,
      required_progress = excluded.required_progress,
      active = excluded.active,
      sort_order = excluded.sort_order;
