-- Vague example data, matching public/data/items.json. Run after schema.sql (safe to re-run).

insert into public.categories (id, name, sort_order) values
  ('category-a', 'Category A', 1),
  ('category-b', 'Category B', 2),
  ('category-c', 'Category C', 3)
on conflict (id) do update
  set name = excluded.name, sort_order = excluded.sort_order;

insert into public.items (id, name, category_id, price_cents, image_path, description, active, sort_order) values
  ('item-01', 'Item 01', 'category-a', 2400, null, null, true, 1),
  ('item-02', 'Item 02', 'category-a', 1600, null, null, true, 2),
  ('item-03', 'Item 03', 'category-b', 3200, null, null, true, 3),
  ('item-04', 'Item 04', 'category-b', 2800, null, null, true, 4),
  ('item-05', 'Item 05', 'category-c', 2000, null, null, true, 5),
  ('item-06', 'Item 06', 'category-c', 3600, null, null, true, 6)
on conflict (id) do update
  set name = excluded.name,
      category_id = excluded.category_id,
      price_cents = excluded.price_cents,
      image_path = excluded.image_path,
      description = excluded.description,
      active = excluded.active,
      sort_order = excluded.sort_order;
