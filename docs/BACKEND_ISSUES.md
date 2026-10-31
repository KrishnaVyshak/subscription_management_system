# Backend issues found while building the frontend

The frontend does not change `/backend` (except the static path / CORS, if needed). Each issue
below lists how the frontend works around it.

## 1. Every real login gets 401: HS256 secret vs ES256 tokens (blocker)

- `middleware/auth.js#verify` uses `SUPABASE_JWT_SECRET` (HS256 only) whenever it is set, and only
  falls back to JWKS when it is not.
- The Supabase project signs access tokens with **ES256** (asymmetric signing keys). With
  `SUPABASE_JWT_SECRET` set in `.env`, every token from `signInWithPassword` fails verification:
  `401 "Invalid or expired token"`.
- **Proof**: a seed staff token is rejected by the server on :4000. The same token is accepted by a
  second instance started with the variable blank (`SUPABASE_JWT_SECRET= PORT=4100 node
  backend/src/index.js`; `env.js` treats empty strings as unset), which then verifies via JWKS.
- **Fix options** (backend owner): remove `SUPABASE_JWT_SECRET` from `.env`, **or** make `verify`
  choose by the token header's `alg` (HS256 → secret, otherwise JWKS).
- Frontend: nothing to do; it sends the Supabase access token as `Bearer`.

## 2. `/api/auth/*` rate limit also covers `GET /auth/me`

- `app.js` applies a 20 requests / 15 min / IP limiter to the whole `/api/auth` prefix, meant for
  signup. `GET /auth/me` is called on every app load, so a few refreshes (or a test run) hit **429**
  and lock everyone behind that IP out of the app.
- Workaround: `AuthProvider` caches the `/auth/me` profile per user id in `sessionStorage` and only
  refetches on sign-in or user change. A 429 shows a clear "Too many attempts" message.
- Suggested fix: limit only `POST /auth/signup` (and maybe `change-password`).

## 3. Production CSP blocks Supabase auth calls

- In production `helmet()` sends its default CSP: `default-src 'self'` with no `connect-src`, so
  the browser blocks `fetch` to `https://<project>.supabase.co` (sign-in, refresh, reset). The inline
  theme script in `index.html` is also blocked (`script-src 'self'`), which only causes a theme
  flash.
- Workaround in the frontend: the theme script moves to a same-origin file
  (`/theme-init.js`) so it passes `script-src 'self'`. Supabase calls still need a backend change:
  add `connectSrc: ["'self'", SUPABASE_URL]` to the helmet CSP. This is static-serving
  configuration, so it may be in scope; it is flagged for approval instead of changed silently.

## 4. No product list for the customer portal's "Manage add-ons"

- Customers get 403 on `/products`, and `/portal/*` has no catalog endpoint. The portal can remove
  add-on lines or change them using what the subscription detail returns, but it cannot list
  add-on products to **add**.
- Workaround: the portal add-on dialog lists add-on products already on the subscription (remove)
  and explains that new add-ons are arranged with the account team. Suggested fix:
  `GET /portal/addons` returning active `type = 'addon'` products with variants and prices.

## 5. Smaller gaps (worked around, no fix strictly needed)

- `GET /invoices` has no `billingRunId` filter. "Send all new invoices" after a run uses
  `status=draft&from=asOfDate&to=asOfDate`.
- `meta.statusCounts` on invoices has no overdue count; the Overdue tab makes a second
  `overdue=true&pageSize=1` request.
- `GET /reports/revenue-trend` takes `months`, not `from`/`to`; the dashboard derives `months` from
  the selected range.
- `/receivables/*` ignore the dashboard's date/plan filters (the ageing chart is always "today").
- Attribute values can only be added (no PATCH/DELETE for a value).
- Subscription lines cannot carry their own taxes; they inherit the product's taxes, so the
  LinesEditor shows taxes read-only rather than as a multi-select.
- No endpoint says whether `DEMO_MODE` is on; the billing as-of date is always offered and a
  `FUTURE_DATE_NOT_ALLOWED` reply is explained inline.
