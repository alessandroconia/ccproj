# ccproj

A static catalog and checkout page, built with React, Vite and Tailwind and hosted on GitHub Pages. Items and categories come from Supabase, with a bundled JSON file as a fallback. Checkout opens an external payment link.

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

Without the Supabase values the app loads `public/data/items.json`. It also uses that file if Supabase can't be reached.

Never use the `service_role` / secret key or the database connection string in any `VITE_` variable, in GitHub Variables, or in the code.

## Supabase setup

1. Create a project.
2. In the SQL Editor run [`supabase/schema.sql`](supabase/schema.sql), then [`supabase/seed.sql`](supabase/seed.sql). Both can be re-run safely.
3. Copy the project URL and the anon/publishable key into your env file.

The schema enables Row Level Security with read-only policies and revokes write privileges, so the public key can only read active items and categories.

### Adding items and images

- Edit the `items` and `categories` tables in the Supabase Table Editor. Prices are integer cents (`2400` = $24.00). Set `active` to false to hide an item.
- Upload an image to the public `item-images` bucket, then set the item's `image_path` to the file name (for example `item-01.jpg`). A full `https://` URL also works. With no path, a placeholder is shown.
- Keep `public/data/items.json` in sync if you want the fallback to match.

## Deployment

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and deploys on every push to `main`.

1. Repo Settings, Pages, Source: **GitHub Actions**.
2. Repo Settings, Secrets and variables, Actions, **Variables** tab: add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and, when ready, `VITE_CHECKOUT_URL` as repository variables.

The site is served under `/ccproj/` (`base` in `vite.config.ts`). Production builds include a Content-Security-Policy meta tag that only allows the site itself, the Supabase origin and Google Fonts.

## Search engines

The site is currently hidden from search engines. To make it indexable, delete `public/robots.txt` (or change `Disallow: /` to `Allow: /`) and remove the `<meta name="robots" ...>` tag in `index.html`.

## Security notes

- The publishable key is visible to anyone who opens the site. That is expected and safe only because of the read-only Row Level Security policies.
- Prices come from the browser. The payment link does not verify cart totals, so real payment handling needs a server-side step.
