import { getJson, imageUrlFor } from "./catalog";

export type PreorderItem = {
  id: string;
  name: string;
  categoryId: string;
  /** Full price of the item. */
  priceCents: number;
  imageUrl: string | null;
  description: string | null;
  /** Units still to be funded. 0 (or missing/invalid data) means not available. */
  quantity: number;
  currentProgress: number;
  requiredProgress: number;
};

export type BoughtItem = {
  id: string;
  sourceItemId: string | null;
  name: string;
  categoryId: string;
  priceCents: number;
  imageUrl: string | null;
  description: string | null;
  /** Informative only: how many units were confirmed. */
  quantity: number;
};

export type Preorders = {
  preorderItems: PreorderItem[];
  boughtItems: BoughtItem[];
};

// Raw row shapes. Supabase tables and public/data/preorders.json share these.
type PreorderItemRow = {
  id: string | number;
  name: string;
  category_id: string | number;
  price_cents: number;
  image_path?: string | null;
  description?: string | null;
  quantity?: number | null;
  current_progress?: number | null;
  required_progress?: number | null;
  active?: boolean | null;
  sort_order?: number | null;
};
type BoughtItemRow = {
  id: string | number;
  source_item_id?: string | number | null;
  name: string;
  category_id: string | number;
  price_cents: number;
  image_path?: string | null;
  description?: string | null;
  quantity?: number | null;
  active?: boolean | null;
  sort_order?: number | null;
};
type PreorderRows = { preorder_items: PreorderItemRow[]; bought_items: BoughtItemRow[] };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, "");
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const bySortOrder = (a: { sortOrder: number }, b: { sortOrder: number }) =>
  a.sortOrder - b.sortOrder;

// Fail closed: anything that is not a finite number counts as 0.
function toCount(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

const isInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value);

// Fail closed: progress must satisfy 2 <= required <= 6 and 0 <= current <= required.
// Anything else makes the item not payable (quantity 0) and keeps the numbers safe to divide by.
function toProgress(
  current: number | null | undefined,
  required: number | null | undefined,
): { currentProgress: number; requiredProgress: number; valid: boolean } {
  if (!isInteger(required) || required < 2 || required > 6) {
    return { currentProgress: 0, requiredProgress: 1, valid: false };
  }
  if (!isInteger(current) || current < 0 || current > required) {
    return { currentProgress: required, requiredProgress: required, valid: false };
  }
  return { currentProgress: current, requiredProgress: required, valid: true };
}

function toPreorders({ preorder_items, bought_items }: PreorderRows): Preorders {
  return {
    preorderItems: preorder_items
      .filter((row) => row.active !== false)
      .map((row) => {
        const { currentProgress, requiredProgress, valid } = toProgress(
          row.current_progress,
          row.required_progress,
        );
        return {
          id: String(row.id),
          name: row.name,
          categoryId: String(row.category_id),
          priceCents: row.price_cents,
          imageUrl: imageUrlFor(row.image_path),
          description: row.description ?? null,
          quantity: valid ? toCount(row.quantity) : 0,
          currentProgress,
          requiredProgress,
          sortOrder: row.sort_order ?? 0,
        };
      })
      .sort(bySortOrder)
      .map(({ sortOrder: _sortOrder, ...item }) => item),
    boughtItems: bought_items
      .filter((row) => row.active !== false)
      .map((row) => ({
        id: String(row.id),
        sourceItemId: row.source_item_id == null ? null : String(row.source_item_id),
        name: row.name,
        categoryId: String(row.category_id),
        priceCents: row.price_cents,
        imageUrl: imageUrlFor(row.image_path),
        description: row.description ?? null,
        quantity: toCount(row.quantity),
        sortOrder: row.sort_order ?? 0,
      }))
      .sort(bySortOrder)
      .map(({ sortOrder: _sortOrder, ...item }) => item),
  };
}

async function loadFromSupabase(url: string, anonKey: string): Promise<PreorderRows> {
  const init = { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } };
  const [preorder_items, bought_items] = await Promise.all([
    getJson<PreorderItemRow[]>(
      `${url}/rest/v1/preorder_items?select=*&active=eq.true&order=sort_order.asc`,
      init,
    ),
    getJson<BoughtItemRow[]>(
      `${url}/rest/v1/bought_items?select=*&active=eq.true&order=sort_order.asc`,
      init,
    ),
  ]);
  return { preorder_items, bought_items };
}

function loadFromJson(): Promise<PreorderRows> {
  return getJson<PreorderRows>(`${import.meta.env.BASE_URL}data/preorders.json`);
}

/** Loads from Supabase when configured; falls back to the static JSON file. */
export async function loadPreorders(): Promise<Preorders> {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      return toPreorders(await loadFromSupabase(SUPABASE_URL, SUPABASE_ANON_KEY));
    } catch (error) {
      console.warn("Supabase unavailable, using static fallback.", error);
    }
  }
  return toPreorders(await loadFromJson());
}

/** Price of one step, always rounded up to the next cent. */
export function stepPriceCents(item: Pick<PreorderItem, "priceCents" | "requiredProgress">): number {
  return Math.ceil(item.priceCents / Math.max(1, item.requiredProgress));
}

/** Steps still needed to fully fund the item. */
export function remainingSteps(
  item: Pick<PreorderItem, "currentProgress" | "requiredProgress">,
): number {
  return Math.max(0, item.requiredProgress - item.currentProgress);
}

/** True only when a visitor may contribute a step. */
export function isOpenForContributions(
  item: Pick<PreorderItem, "quantity" | "currentProgress" | "requiredProgress">,
): boolean {
  return item.quantity > 0 && item.currentProgress < item.requiredProgress;
}
