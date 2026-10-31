# Brightloop Subscription Management System

Subscriptions, recurring billing, discounts, payments and a finance dashboard.
React (Vite) frontend, Express backend, Supabase Postgres + Auth, in one npm-workspaces repo.

## Layout

```
frontend/   React + Vite app (Tailwind, TanStack Query, React Router)
backend/    Express API; in production also serves frontend/dist
shared/     Constants and Zod schemas used by both (roles, statuses, password rule)
supabase/   config.toml, SQL migrations, seed.sql
```

## First-time setup

1. Node 20+ and npm. From the repo root: `npm install`.
2. `cp .env.example .env` and fill in the values from your Supabase project
   (Project Settings → Database for `DATABASE_URL`, Project Settings → API for the keys).
   Both apps read this single root `.env`; only `VITE_*` variables reach the browser.
3. Link the Supabase project and apply migrations:
   ```
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npm run db:migrate
   ```
4. In the Supabase dashboard (Authentication settings): set custom SMTP, set the Site URL to
   `APP_URL`, add `APP_URL/reset-password` to redirect URLs, and set minimum password length to 9.

## Scripts (run from the root)

| Script               | What it does                                               |
| -------------------- | ---------------------------------------------------------- |
| `npm run dev`        | API on :4000 and Vite on :5173 (`/api` is proxied to :4000) |
| `npm run build`      | Builds the frontend into `frontend/dist`                   |
| `npm start`          | Starts the API; with `NODE_ENV=production` it serves the build |
| `npm test`           | Vitest in every workspace                                  |
| `npm run lint`       | ESLint across the repo                                     |
| `npm run format`     | Prettier                                                   |
| `npm run db:new <name>` | New empty migration in `supabase/migrations`            |
| `npm run db:migrate` | Pushes pending migrations to the linked project            |
| `npm run seed`       | Pushes migrations and `supabase/seed.sql`                  |

`GET /api/health` returns DB status and the server time in IST; the frontend home page shows it.

## Design system

Run `npm run dev` and open `/design-system` for the live reference (brand, foundations,
components and a dashboard pattern, in light and dark).

- **Brand**: Ink (text, navigation rail), Paper (surfaces), Tide (every action: buttons, links,
  focus, selection, in both themes) and Volt (the highlight, at most once per view, never text).
  Logo and loop motif live in `frontend/src/components/brand`.
- **Type**: Spectral for headlines and figures, Geist for UI, Geist Mono for IDs and
  overlines. Spectral has one weight per role, lighter as it gets larger: 200 numerals, 300
  display, 400 titles and statements, 500 figures. Utilities: `type-display`, `type-h1`–`type-h3`,
  `type-statement`, `type-figure`, `type-numeral`, `type-body`, `type-caption`, `type-overline`.
- **Tokens** are in `frontend/src/index.css` (Tailwind v4 `@theme`). Use semantic utilities
  (`bg-card`, `text-muted-foreground`, `bg-primary`, `bg-highlight`, `bg-success-soft`…)
  rather than raw scales, so both themes keep working.
- **Components** are in `frontend/src/components/ui` (shadcn-style, one per file). Buttons are
  pills with a loop-ripple press animation (skipped under reduced motion). Merge classes with
  `cn()` from `@/lib/utils`.
- **Status colours** map one-to-one to subscription and invoice states in `StatusBadge`.
  Charts use `--chart-1…3` (Tide, Ember, Cobalt) in that fixed order; never Volt or status colours.
