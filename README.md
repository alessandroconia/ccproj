# ccproj

A static catalog and checkout page, built with React, Vite and Tailwind and hosted on GitHub Pages. Items and categories come from Supabase, with a bundled JSON file as a fallback. Checkout opens an external payment link. A second tab, **Preordini**, lets the community fund an item in small steps.

Live site: https://alessandroconia.github.io/ccproj/

## Local development

Requires Node 22 and pnpm 10 (see `.mise.toml`).

```sh
pnpm install
cp .env.example .env.local   # then fill in the values
pnpm dev                     # http://localhost:5173/ccproj/
```

Other scripts: `pnpm build`, `pnpm preview`, `pnpm exec tsc --noEmit`.

## Configuration

All values are read at build time and end up in the public bundle. Only put public values here.

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | no | Supabase project URL, `https://<ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | no | Supabase anon or publishable key (`sb_publishable_...`) |
| `VITE_CHECKOUT_URL` | no | Checkout link. Must start with `https://`. Defaults to `https://www.paypal.com/it/home` |

Without the Supabase values the app loads `public/data/items.json` (and `public/data/preorders.json` for Preordini). It also uses those files if Supabase can't be reached.

Fonts are self-hosted (`@fontsource-variable`), so visitors' browsers contact no third party except Supabase (catalog) and, at checkout, PayPal.

Never use the `service_role` / secret key or the database connection string in any `VITE_` variable, in GitHub Variables, or in the code.

## Supabase setup

1. Create a project.
2. In the SQL Editor run [`supabase/schema.sql`](supabase/schema.sql), then [`supabase/seed.sql`](supabase/seed.sql). Both can be re-run safely.
3. Copy the project URL and the anon/publishable key into your env file.

The schema enables Row Level Security with read-only policies and revokes write privileges, so the public key can only read active items and categories.

### Adding items and images

- Edit the `items` and `categories` tables in the Supabase Table Editor. Prices are integer euro cents (`2400` = 24,00 €). Set `active` to false to hide an item.
- **Stock:** `available_quantity` is the maximum a visitor can add to the bag. It defaults to `0` (sold out) for every item, so set the real stock in the Table Editor. Re-running `seed.sql` never overwrites it. There is no shipping fee.
- Upload an image to the public `item-images` bucket, then set the item's `image_path` to the file name (for example `item-01.jpg`). A full `https://` URL also works. With no path, a placeholder is shown.
- Keep `public/data/items.json` in sync if you want the fallback to match.

## Preordini (community update)

The **Preordini** tab (`#/preordini`) has its own cart and PayPal button and never mixes with the shop. Each preorder item has a full price and 2 to 6 steps. A visitor pays one step per item. The step price is `price_cents / required_progress`, **rounded up** to the next cent (`2400 / 4` = 6,00 €, `1600 / 6` = 2,67 €), so the steps can add up to a cent or two more than the full price. Items that are fully funded and processed by the admin are shown as **Confermato** (display only).

### Setup

The SQL lives in [`supabase/community-update/`](supabase/community-update). Run it after the main setup, in the SQL Editor, in this order:

1. [`supabase/schema.sql`](supabase/schema.sql) and [`supabase/seed.sql`](supabase/seed.sql) (see "Supabase setup")
2. [`supabase/community-update/schema.sql`](supabase/community-update/schema.sql): creates `preorder_items` and `bought_items`, with the same read-only security as the shop
3. [`supabase/community-update/seed.sql`](supabase/community-update/seed.sql): example items. Re-running never overwrites `quantity` or `current_progress`.

[`complete-preorders.sql`](supabase/community-update/complete-preorders.sql) is not part of the setup, it is the routine described below.

### Updating progress and stock by hand

Nothing is automatic. In the Supabase Table Editor, edit `preorder_items`:

- `quantity`: units that can still be funded. It starts at `0`, so every item is greyed out ("Non disponibile") until you set the real value.
- `current_progress`: steps paid so far. Raise it by hand when payments arrive. It must stay between `0` and `required_progress`.
- `required_progress` (2 to 6) cannot go below `current_progress`: change both together if needed.

An item accepts contributions only while `quantity > 0` and `current_progress < required_progress`. When progress reaches the required value the page shows "Completo" until you run the completion script.

### Confirming completed items

In the SQL Editor, paste and run [`complete-preorders.sql`](supabase/community-update/complete-preorders.sql). In one transaction it picks every active item with `current_progress = required_progress` and `quantity > 0`, adds 1 to its `bought_items` row (`bought-<preorder id>`, created if missing), subtracts 1 from `quantity` and resets `current_progress` to `0`. It returns the items moved, or an empty list if none were complete. It is safe to re-run. Each item completes at most once per run, so run it again if a restocked item is already full. It can only be run from the SQL Editor, the public key has no write access.

Keep `public/data/preorders.json` in sync if you want the fallback to match (its items are all unpurchasable).

## Deployment

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and deploys on every push to `main`.

1. Repo Settings, Pages, Source: **GitHub Actions**.
2. Repo Settings, Secrets and variables, Actions, **Variables** tab: add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and, when ready, `VITE_CHECKOUT_URL` as repository variables.

The site is served under `/ccproj/` (`base` in `vite.config.ts`). Production builds include a Content-Security-Policy meta tag that only allows the site itself and the Supabase origin.

## Search engines

The site is currently hidden from search engines. To make it indexable, delete `public/robots.txt` (or change `Disallow: /` to `Allow: /`) and remove the `<meta name="robots" ...>` tag in `index.html`.

## Legal pages

The footer links to three draft pages (`#/note-legali`, `#/privacy`, `#/termini`) defined in [`src/Legal.tsx`](src/Legal.tsx). They contain only headings and `[DA COMPILARE]` placeholders. Fill them in (ideally with a lawyer or consultant) before taking real payments.

## Security notes

- **Stock is not enforced at payment.** `available_quantity` only limits what the page lets a visitor add. A PayPal link does not check or reduce stock, and the page does not refresh stock while it is open, so two buyers can still pay for the last unit. Real stock control needs a server-side step (for example a Supabase Edge Function with PayPal webhooks).

- **Preorder progress is not verified at payment either.** `current_progress` is only what the admin entered. The page does not refresh it while open, and PayPal knows nothing about it, so two people can pay for the same step. Reconcile payments by hand when you update `current_progress`.
- The publishable key is visible to anyone who opens the site. That is expected and safe only because of the read-only Row Level Security policies.
- Prices come from the browser. The payment link does not verify cart totals, so real payment handling needs a server-side step.
