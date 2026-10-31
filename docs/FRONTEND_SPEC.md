# Brightloop Subscription Management — Frontend Spec

This file is the single source of truth for the frontend in `/frontend`.

- **Design** comes from the existing design scheme in `/frontend`.
- **Data** comes from the Express API in `/backend`.
- Where this spec is silent, choose the simplest correct behaviour and log it in `docs/FRONTEND_DECISIONS.md`.

## 0. How to work
1. **Audit before planning.**
   - **Design:** read everything in `/frontend` and write `docs/DESIGN_NOTES.md`. Cover tokens (colours, type, spacing, radius, shadows), fonts, existing components, layout patterns, icon set, light/dark handling and the CSS approach (Tailwind config, CSS variables, CSS modules, etc.).
   - **API:** read `/backend/docs/API.md` and all `/backend/src/modules/*/routes.js` + `schemas.js`. Write `docs/API_MAP.md`: every endpoint with role, params, body and response shape. **The backend code wins** over this spec if they differ.
2. Enter plan mode. Show the plan for every phase in section 9, then wait for approval.
3. Build phase by phase. After each phase:
   - run lint, tests and build
   - click through the pages against the running backend
   - commit as `fe phase N: <name>`
4. **Do not change `/backend`.** The only exceptions are the static-serving path and the CORS origin, if needed for integration. If you find a backend bug, list it in `docs/BACKEND_ISSUES.md` and work around it gracefully.
5. **Use the existing design.** Reuse its tokens and components; build any missing ones in the same visual language. Do not add a second UI library or invent new colours or fonts.

## 1. Stack
- Keep what `/frontend` already uses (React, Vite, styling approach, component kit).
- Add only what is missing from this list:
  - React Router v6 (`createBrowserRouter`, lazy routes)
  - TanStack Query
  - axios
  - @supabase/supabase-js (anon key: sign-in, sign-out, session refresh, reset email only)
  - React Hook Form + zod
  - Recharts (style it with the design tokens)
  - date-fns
  - a toast library, unless the design already has one
- Env: `VITE_API_URL=/api`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`.
- Vite dev proxy: `/api` → the backend port.
- `npm run build` outputs `frontend/dist`, which Express serves in production.

## 2. Architecture
```
frontend/src/
  lib/        api.js (axios), supabase.js, queryClient.js, format.js (money, dates, status labels), errors.js
  api/        one file per module: keys + hooks (useSubscriptions, useTransitionSubscription, ...)
  auth/       AuthProvider, ProtectedRoute, RoleGate, useAuth
  layouts/    AuthLayout, AppLayout (admin/staff), PortalLayout (customer)
  components/ shared UI (section 4)
  features/   one folder per module: pages, forms, module-specific components
  router.jsx
```

**API client and auth**
- axios attaches `Authorization: Bearer <supabase access_token>`.
- On 401: refresh once, then sign out and redirect to `/login`.
- Unwrap `{ data, meta }` into `{ data, meta }`.
- Map `{ error: { code, message, details } }`:
  - 400 → field errors on the form (`details` maps to RHF `setError`)
  - 403 → toast "You don't have access" + redirect to `/403` on page loads
  - 404 → not-found state
  - 409 and 422 → toast with a friendly message per `details.rule` (map every rule code from `API_MAP.md`)
- `AuthProvider` holds the session, calls `GET /auth/me` and exposes `{ user, role, customerId, loading, signIn, signOut }`.

**Server state (TanStack Query)**
- Query keys: `['subscriptions', filters]`, `['subscription', id]`, and so on.
- Mutations invalidate the related lists, detail and dashboard keys.
- staleTime 30s, retry 1.

**List pages**
- Filters, sort, page and pageSize live **in the URL search params**, so lists are shareable and survive refresh.
- Server-side pagination only. Debounce search by 300 ms.

**Data display**
- Money: the API returns strings. Display with `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.
- Never do money maths in the UI except a *preview*; the backend total is authoritative.
- Dates are shown as `dd MMM yyyy`.

**Actions and states**
- **Action buttons come from the backend's `allowedActions[]`** on subscriptions; never re-implement the state machine.
- Role checks in the UI only hide things; the API enforces them.
- Every data view has loading (skeleton), empty (with a primary action) and error (retry) states.
- Every destructive or irreversible action (cancel, close, delete payment, run billing) goes through a confirm dialog.

## 3. Routes
| Path | Page | Access |
|---|---|---|
| `/` | Redirect by role (staff/admin → `/app/dashboard`, customer → `/portal`) | — |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | Auth | Public (signed-in users are redirected) |
| `/app/dashboard` | Finance dashboard | A, S |
| `/app/customers`, `/new`, `/:id` | Customers | A, S |
| `/app/subscriptions`, `/new`, `/:id` | Subscriptions | A, S |
| `/app/invoices`, `/:id` | Invoices | A, S |
| `/app/payments` | Payments | A, S |
| `/app/receivables` | Outstanding and overdue | A, S |
| `/app/billing` | Billing runs | A (S view only) |
| `/app/catalog/products`, `/new`, `/:id` | Products and variants | A (S read-only) |
| `/app/catalog/attributes` | Attributes and values | A (S read-only) |
| `/app/catalog/plans`, `/new`, `/:id` | Plans | A (S read-only) |
| `/app/templates`, `/new`, `/:id` | Quotation templates | A (S read-only) |
| `/app/discounts`, `/new`, `/:id` | Discount rules | A (S read-only) |
| `/app/settings/taxes`, `/app/settings/payment-terms`, `/app/settings/company` | Settings | A (S read-only) |
| `/app/users` | Staff management | A |
| `/portal` | Overview | C |
| `/portal/subscriptions`, `/:id` | Own subscriptions | C |
| `/portal/invoices`, `/:id` | Own invoices | C |
| `/portal/payments`, `/portal/profile` | Own payments, profile | C |
| `/403`, `*` | Forbidden, Not found | — |

**AppLayout sidebar**
- Overview: Dashboard
- Sales: Customers, Subscriptions, Templates
- Billing: Invoices, Payments, Receivables, Billing runs
- Catalog: Products, Attributes, Plans, Discounts
- Settings: Taxes, Payment terms, Company, Users (admin only)

The topbar has global search (subscription or invoice number, customer name), the user's name, a role badge and sign-out. On mobile the sidebar collapses to a drawer.

**PortalLayout**: a simple top nav. It must feel like a customer product, not an admin tool.

## 4. Shared components (build in the existing design language)
| Component | What it does |
|---|---|
| `PageHeader` | Title, breadcrumb, primary action |
| `DataTable` | Server-driven: sort, pagination, row click, selection for bulk actions, column formatting |
| `FilterBar` | Search, status chips with counts from `meta.statusCounts`, date range presets (this month, last month, this quarter, custom), entity pickers |
| `StatusBadge` | One consistent colour mapping for every subscription and invoice status, plus overdue and partially paid |
| `MoneyCell` | Formatted INR amounts |
| `DateCell` | Formatted dates |
| `EmptyState`, `ErrorState`, `Skeletons` | The three data states |
| `ConfirmDialog` | Gate for destructive or irreversible actions |
| `FormField` wrappers | RHF + zod with inline errors |
| `EntityCombobox` | Async search pickers for customer, product (+ variant), plan, discount |
| `LinesEditor` | Rows of product, variant, qty, unit price (defaulted, editable), taxes (multi-select), amount. Add/remove rows, live preview totals; footer shows subtotal, discount, tax, total |
| `StatusStepper` | Draft → Quotation → Confirmed → Active → Closed with the current step highlighted (Paused shown as a side state) |
| `ActivityTimeline` | Status history |
| `KpiCard` | Value, label, optional delta, click-through link |
| `ChartCard` | Recharts wrapper using design tokens |
| `PasswordChecklist` | Live ✓/✗ for: ≥ 9 characters, uppercase, lowercase, special character |

## 5. Pages and features
**Auth**
- **Login:** supabase `signInWithPassword` → `/auth/me` → redirect by role.
- **Signup:** name, email, phone, password + `PasswordChecklist`.
  - Validate with the same regex as the backend: `^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$`.
  - `POST /auth/signup`, then sign in. A 409 shows "An account with this email already exists" on the email field.
- **Forgot password:** `resetPasswordForEmail(email, { redirectTo: VITE_APP_URL + '/reset-password' })`. Always show the same "check your inbox" message.
- **Reset password:** new + confirm with the checklist, then `POST /auth/change-password`, then redirect to login.

**Dashboard** (`/reports/summary`, `/revenue-trend`, `/by-plan`, `/receivables/summary`, `/receivables/overdue`)
- **Filters:** date range, plan, customer; these drive every widget.
- **KPI cards:** active subscriptions, MRR, ARR, revenue collected, invoiced, outstanding, overdue (count + amount), new and churned. Each card links to its filtered list.
- **Charts:**
  - invoiced vs collected per month (line)
  - MRR by plan (bar)
  - receivables ageing (bar: not due, 1–30, 31–60, 61–90, 90+)
- **Table:** top overdue invoices with quick "Record payment" and "Send reminder" actions.

**Customers**
- **List:** search, "has portal login" filter.
- **Form:** name, email, phone, billing address, GSTIN.
- **Detail:**
  - header stats (active subscriptions, outstanding, overdue)
  - tabs: Subscriptions, Invoices, Payments
  - "Invite to portal" button when there is no login
  - "New subscription" button prefilled with this customer

**Catalog** (admin edits; staff see read-only forms with the save buttons hidden)
- **Products:**
  - List: search, type filter, active toggle.
  - Form tabs:
    - General: name, type, sales price, cost price, notes, active
    - Variants: pick attribute values and see the computed price live (e.g. CRM Suite 1,000 + Odoo 560 = 1,560); list existing variants
    - Taxes: multi-select
- **Attributes:** an attribute list with inline editable values and extra price.
- **Plans:**
  - List columns: period, price, min qty, availability, flags as small badges.
  - Form:
    - name, product, price
    - billing period + "every N" interval
    - min quantity, available from/to
    - four switches (auto-close, closable, pausable, renewable), each with a one-line explanation
  - Note: "Changes apply to new subscriptions only".

**Templates**
- Name, plan, payment term, validity (days), notes, `LinesEditor`.

**Subscriptions**
- **List:**
  - status tabs with counts (Draft, Quotation, Confirmed, Active, Paused, Closed, All)
  - filters: customer, plan, start date range; search by number or customer
  - columns: number, customer, plan, status, start, expiry, next invoice, recurring total
- **New:**
  - "Start from template" picker, which prefills plan, term, lines and quote validity
  - customer picker, with inline "create customer" in a dialog
  - plan (only available plans), start/expiry dates, payment term, salesperson
  - `LinesEditor`
  - save as Draft
  - min-quantity hint from the plan
- **Detail:**
  - `StatusStepper` on top
  - action buttons rendered **only from `allowedActions`**: Send quotation, Confirm, Activate, Pause, Resume, Close (with reason), Renew, Invoice now
  - info card: customer, plan + flags, dates, next invoice date, payment term
  - lines (editable only when the backend allows; in Active, only quantity and add-ons, with a note "takes effect next billing period")
  - discounts card: attach or remove subscription discounts; the totals preview shows the discount
  - tabs: Invoices, History (`ActivityTimeline`)
  - quotation expiry is shown with a warning when it is close

**Invoices**
- **List:**
  - status tabs (Draft, Confirmed, Paid, Cancelled, Overdue)
  - filters: customer, date and due-date ranges; search
  - footer totals from `meta.totals`
  - bulk select → Confirm, Send
  - Export CSV
- **Detail:**
  - document-style view: company, bill-to, number, dates, period, lines with discount and tax columns, totals, paid, amount due, PAID/OVERDUE badge
  - actions: Confirm, Send, Print/Download PDF (open the `/invoices/:id/pdf` blob in a new tab), Cancel (hidden if payments exist), Record payment, Send reminder (when overdue)
  - payments list on the invoice

**Record payment dialog**
- Fields: method, amount (prefilled with amount due), date (today), note.
- Client-side check that 0 < amount ≤ due; the server error is shown if it disagrees.
- On success: refresh the invoice, the lists and the dashboard.

**Payments**
- List with method, date and customer filters, and a total amount.
- Admin can delete with confirmation.

**Receivables**
- Summary cards, an ageing bar, and an overdue table (days overdue, customer contact) with Record payment and Send reminder actions.

**Discounts**
- **List:**
  - state badge (Scheduled, Active, Expired, Exhausted)
  - usage bar "7 / 10 used"
- **Form:**
  - name, type (percent/fixed), value, scope (product/subscription)
  - product multi-select (product scope only)
  - min amount or min quantity
  - start/end dates, usage limit
- Fields locked once used: show why.

**Billing** (admin)
- "Run billing now" with an optional as-of date (only when the backend allows a demo mode) → confirm → result card "Generated N · Skipped N · Failed N".
- Run history table; run detail shows errors.
- After a run, offer "Send all new invoices".
- Admin "Run job" buttons (activate, auto-close, expire quotes, expire discounts) where the backend exposes them.

**Users** (admin)
- Staff list (name, email, role, active).
- "Add staff" dialog (name, email → a setup email is sent).
- Activate/deactivate (not yourself).

**Settings**
- Taxes: name, type, rate, price included.
- Payment terms: name, due days.
- Company details used on invoices.

**Customer portal**
- **Overview:** active subscriptions, next invoice date and estimated amount, outstanding balance, overdue alert.
- **Subscriptions:**
  - cards, then detail
  - actions only from `allowedActions`: Pause, Resume, Cancel (confirm, explain what happens), Renew
  - "Manage add-ons": add or remove addon products, with "takes effect next billing period"
- **Invoices:** list, detail, download PDF.
- **Payments:** history.
- **Profile:** name, phone, billing address; change password with the checklist.

## 6. Quality bar
- **Responsive:** works on mobile width. Tables scroll horizontally or collapse to cards on small screens.
- **Accessible:** labels on every input, keyboard-usable dialogs and menus, visible focus, colour is never the only status signal.
- **Feedback:** every mutation shows pending state on its button and a success or error toast. Disable double-submit.
- **Performance:** route-level lazy loading; no fetching the full list client-side; keep previous data while paging (`placeholderData: keepPreviousData`).
- **No hard-coded data:** every number on screen comes from the API.

## 7. Testing
- Vitest + React Testing Library:
  - `PasswordChecklist` + regex (`Abcdefg!1` and `Abcdefgh!` pass; `Abcdefg!` and `abcdefgh!` fail)
  - `format.js` money and dates
  - error mapping
  - `ProtectedRoute` role redirects
  - `LinesEditor` totals preview
- Playwright smoke test against the running backend with seed data. **Admin flow:**
  1. login
  2. create product with Odoo variant → price 1,560
  3. create plan
  4. subscription from template → Confirm → Activate
  5. run billing twice → second run "Generated 0"
  6. record partial payment, then full → Paid
  7. dashboard loads
- Playwright smoke test, **customer flow:** login → see only own subscriptions → pause (pausable plan) → download invoice PDF → visiting another customer's invoice URL shows Not found.

## 8. Integration checklist
- Every endpoint in `docs/API_MAP.md` is used by at least one screen (or listed as intentionally unused in decisions).
- Every `details.rule` code has a human message.
- Status labels and colours match across lists, details, badges and portal.
- `npm run build` succeeds, and the backend serves `frontend/dist` with SPA fallback (`/app/*`, `/portal/*` deep links work on refresh).

## 9. Build order
One commit per phase.
1. Audit → `DESIGN_NOTES.md` + `API_MAP.md`; app shell, router, layouts, API client, auth provider, shared components (section 4)
2. Auth pages + role routing + Users
3. Catalog: products, variants, attributes, plans, taxes, payment terms, company settings
4. Customers + templates + subscriptions (list, new, detail, actions, discounts attach)
5. Billing page + invoices (list, detail, PDF, send, bulk) + discounts module
6. Payments, record-payment dialog, receivables
7. Dashboard
8. Customer portal
9. Polish: responsive, empty/error states, accessibility pass, error-rule messages; tests + Playwright smoke; README update

## 10. Done when
- Every route in section 3 works against the real backend with seed data, for every role, and the UI clearly follows the existing design in `/frontend`.
- Unit tests and both Playwright flows pass. `npm run build` passes with no console errors.
- Wrong-role URLs show `/403`. A customer can never see another customer's data.
- `docs/DESIGN_NOTES.md`, `docs/API_MAP.md`, `docs/FRONTEND_DECISIONS.md` and `docs/BACKEND_ISSUES.md` (if any) exist.
- Finish by printing a summary, anything incomplete, and the commands to run the full app.
