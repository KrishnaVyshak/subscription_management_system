# Frontend decisions

Choices made where `docs/FRONTEND_SPEC.md` is silent or the backend differs. Newest phase last.

## Phase 1: shell and foundations

- **React Router 7, not 6.** `/frontend` already depends on `react-router-dom@7`. Its
  `createBrowserRouter` API is the v6 one the spec names, so it is kept rather than downgraded.
- **Lazy pages via `React.lazy` + `<Suspense>` in each layout**, not the router's `lazy` route
  property. That avoids the router's hydration-fallback warning for SPA builds and lets each layout
  show its own skeleton.
- **`/auth/me` is cached per user in `sessionStorage`**, because the backend rate-limits all of
  `/api/auth/*` to 20 requests / 15 min (BACKEND_ISSUES #2). It is refetched on sign-in and on
  demand (`refreshMe`).
- **401 handling:** the axios interceptor calls `supabase.auth.refreshSession()` once and retries.
  A second 401 signs out and goes to `/login?next=<where you were>`. `next` is honoured only if
  the signed-in role may open it.
- **403 on a page load** (query) → toast "You don't have access" + redirect to `/403`. 403 on a
  mutation → toast only.
- **Errors**: every mutation toasts its error globally (`MutationCache`) unless it opts out with
  `manualError` to map 400 zod issues onto form fields (`path.join('.')` → RHF `setError`).
  422 messages come from one table, `src/lib/rules.js`, covering every `details.rule` the backend
  can return.
- **Retries:** queries retry once, but never on 4xx.
- **Money:** `formatMoney` shows paise (`₹1,180.00`) using the spec's `Intl.NumberFormat('en-IN',
  { style: 'currency', currency: 'INR' })`. Chart axes keep the design system's compact
  `formatCurrency`.
- **Dates:** business dates (`YYYY-MM-DD`) are parsed as local calendar days, so they never shift
  by a timezone. "Today" for presets is computed in Asia/Kolkata, matching the API.
- **The LinesEditor preview** mirrors the backend's invoice maths (integer paise, the largest
  subscription discount spread proportionally, then tax including price-included taxes). It is
  labelled "Preview"; server totals are shown wherever they exist.
- **Line taxes are read-only** in the LinesEditor. The API gives lines the product's taxes and has
  no per-line tax input (API_MAP ⚠). Taxes are edited on the product.
- **Unit price** defaults to the catalog price (plan price for the plan's product, else the sales
  price, plus variant extras). Untouched prices are sent as `null` so the server prices them; a
  typed price is sent as typed.
- **No new UI library.** The combobox, drawer and menus are built from the kit. The drawer is a
  native `<dialog>` like the kit's `Dialog`; the combobox follows the WAI-ARIA combobox pattern
  on the `popover` surface.
- **StatusBadge** gained derived states (`overdue`, `partially_paid`), discount states and run
  states, and shows title-case labels (still rendered as the uppercase mono stamp).
- **The health page moved** from `/` to `/status`; `/` now redirects by role. `/design-system`
  stays.
- **The theme script** moved from inline in `index.html` to `public/theme-init.js`, so it passes
  the production CSP (`script-src 'self'`).
- **Vite proxy target** can be overridden with `API_PROXY_TARGET` (default `http://localhost:4000`).
- **Backend change (approved):** `backend/src/app.js` adds Supabase's origin to the helmet CSP
  `connect-src`, so the served SPA can sign in (BACKEND_ISSUES #3).
- **`VITE_APP_URL`** falls back to `window.location.origin` when unset (it isn't in `.env`).
