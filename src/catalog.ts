export type Category = {
  id: string;
  name: string;
  sortOrder: number;
};

export type Item = {
  id: string;
  name: string;
  categoryId: string;
  priceCents: number;
  imageUrl: string | null;
  description: string | null;
  /** Units that can be bought. 0 (or missing/invalid data) means sold out. */
  availableQuantity: number;
};

export type Catalog = {
  categories: Category[];
  items: Item[];
};

// Raw row shapes. Supabase tables and public/data/items.json share these.
type CategoryRow = { id: string | number; name: string; sort_order?: number | null };
type ItemRow = {
  id: string | number;
  name: string;
  category_id: string | number;
  price_cents: number;
  image_path?: string | null;
  description?: string | null;
  available_quantity?: number | null;
  active?: boolean | null;
  sort_order?: number | null;
};
type CatalogRows = { categories: CategoryRow[]; items: ItemRow[] };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, "");
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const IMAGE_BUCKET = "item-images";

const bySortOrder = (a: { sortOrder: number }, b: { sortOrder: number }) =>
  a.sortOrder - b.sortOrder;

export function imageUrlFor(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (!SUPABASE_URL) return null;
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${encoded}`;
}

// Fail closed: anything that is not a finite number counts as sold out.
function toStock(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function toCatalog({ categories, items }: CatalogRows): Catalog {
  return {
    categories: categories
      .map((row) => ({ id: String(row.id), name: row.name, sortOrder: row.sort_order ?? 0 }))
      .sort(bySortOrder),
    items: items
      .filter((row) => row.active !== false)
      .map((row) => ({
        id: String(row.id),
        name: row.name,
        categoryId: String(row.category_id),
        priceCents: row.price_cents,
        imageUrl: imageUrlFor(row.image_path),
        description: row.description ?? null,
        availableQuantity: toStock(row.available_quantity),
        sortOrder: row.sort_order ?? 0,
      }))
      .sort(bySortOrder)
      .map(({ sortOrder: _sortOrder, ...item }) => item),
  };
}

export async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`);
  return (await response.json()) as T;
}

async function loadFromSupabase(url: string, anonKey: string): Promise<CatalogRows> {
  const init = { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } };
  const [categories, items] = await Promise.all([
    getJson<CategoryRow[]>(`${url}/rest/v1/categories?select=*&order=sort_order.asc`, init),
    getJson<ItemRow[]>(`${url}/rest/v1/items?select=*&active=eq.true&order=sort_order.asc`, init),
  ]);
  return { categories, items };
}

function loadFromJson(): Promise<CatalogRows> {
  return getJson<CatalogRows>(`${import.meta.env.BASE_URL}data/items.json`);
}

/** Loads from Supabase when configured; falls back to the static JSON file. */
export async function loadCatalog(): Promise<Catalog> {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      return toCatalog(await loadFromSupabase(SUPABASE_URL, SUPABASE_ANON_KEY));
    } catch (error) {
      console.warn("Supabase unavailable, using static fallback.", error);
    }
  }
  return toCatalog(await loadFromJson());
}
