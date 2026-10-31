# Decisions

Where `docs/BACKEND_SPEC.md` is silent or does not match this repo, this file records what was chosen and why. Newest sections are added per build phase.

## Repo mapping
- The spec's `server/` is `backend/`, and the frontend lives in `frontend/`. Domain code is in `backend/src/domain`, modules are in `backend/src/modules/<name>`, and CLI scripts are in `backend/scripts`.
- Shared enums and the password rule live in the `shared/` workspace (`@brightloop/shared`), so frontend and backend use one definition.
- Migrations are applied with `npm run db:migrate`, which runs `supabase db push --db-url $DATABASE_URL`. This works without `supabase link`/login. `supabase db push` on a linked project does the same.

## Environment
- Only `DATABASE_URL` is required to boot. Supabase keys, SMTP and admin credentials are checked where they are used, so a teammate without every key still gets a running server.
- `MAIL_FROM` falls back to the existing `SMTP_FROM`.
- `DEMO_MODE` (default off) allows future `asOfDate` billing runs. `JOBS_ENABLED` (default on) toggles the daily cron.

## Auth and users
- `profiles.id` equals `auth.users.id` but has **no foreign key** to `auth.users`. This lets the same migrations run on plain Postgres for tests. The server always creates both sides and deletes the auth user if the database step fails.
- Signup strips unknown fields, so a `role` in the body is silently ignored and the role is always `customer`. Email is lower-cased.
- Signup links an existing customer with the same email (one created by staff) when that customer has no login yet. Otherwise it creates a new customer.
- `PATCH /auth/me` only changes `fullName`.
- `POST /auth/change-password` takes `{ password }` and does not re-check the current password. A valid session is the proof, as with Supabase's own `updateUser`.
- Deactivated profiles get 403 on every authenticated route. Their auth user is not banned in Supabase.
- `PATCH /users/:id` (admin only): you cannot deactivate yourself (`CANNOT_DEACTIVATE_SELF`) or change your own role (`CANNOT_CHANGE_OWN_ROLE`). Roles switch only between admin and staff, and customers keep the customer role (`CUSTOMER_ROLE_FIXED`).
- `POST /users/staff` creates the auth user with a random password and sends Supabase's reset-password email (redirect `APP_URL/reset-password`) for password setup. If that email fails, the user is still created and the response has `passwordEmailSent: false`.
- `create-admin` is idempotent. It finds or creates the auth user, resets the password to `ADMIN_PASSWORD`, and upserts the profile as an active admin.

## API conventions
- Sort syntax is `sort=field` or `sort=-field` (descending). Each list whitelists its fields; anything else returns 400.
- Postgres constraint errors that get past service checks map to the standard error shape: unique → 409 `CONFLICT`, check → 400 `VALIDATION_ERROR`.
- `DATE` columns are returned as `YYYY-MM-DD` strings and money as 2-decimal strings.
- Document numbers come from one global sequence per kind. The year label comes from the document date, and numbers are not reset each year.

## Testing
- Integration tests run against `TEST_DATABASE_URL` when it is set. When it is unset, they run against a throwaway **embedded Postgres** (`embedded-postgres`) started by vitest's global setup, so `npm test` needs no Docker or cloud DB. The public schema is rebuilt from `supabase/migrations` on every run, and tables are truncated before each test.
- Supabase Auth admin is mocked globally (`src/tests/helpers/fakeSupabase.js`). JWTs are HS256-signed with a test secret.

## Catalog (phase 2)
- Percent taxes store the percentage (`18` = 18 %, max 100). Fixed taxes store an amount per unit.
- Rates are `numeric(12,4)`. Money is `numeric(12,2)` and accepted as a string or a number with at most 2 decimals.
- A variant is one value per attribute. Its name is `"<product> (<values sorted by attribute name>)"`. A `signature` column (sorted value ids) makes a duplicate combination for the same product a 409.
- Catalog `DELETE` routes are soft deletes (`is_active = false`). Lists hide inactive rows unless `includeInactive=true`.
- `GET /plans?available=true` means active and today (IST) is within `available_from..available_to` (both optional).
- Plan edits never affect existing subscriptions. A subscription copies the plan's price (on its plan line), `billing_period` and `interval_count` when it is created. Plan **flags** (closable, pausable, renewable, auto_close) are read live from the plan, because they are policy, not price.
- Settings are returned as `[{ key, value }]` and updated with `PUT /settings/:key { value }`. Only `company` and `invoice.auto_confirm` are accepted.
- Quantities are whole numbers.

## Customers, templates, subscriptions (phase 3)
- **Staff permissions**: staff have full access to customers, subscriptions, invoices and payments, and read-only access to the catalog (products, plans, taxes, terms, templates, settings, discounts). They cannot manage users, write catalog or discount rules, run billing, delete payments or run jobs. Only admins can `force` an early close.
- Customer search uses the trigram index (`similarity` / `%`) on name, plus substring match on name and email. Results are ranked by similarity unless `sort` is given.
- A customer's email is fixed once they have a portal login, because it is the login. `POST /customers/:id/invite` creates the login with a random password and emails a password-setup link.
- Templates: when the template's lines don't include the plan's product, a plan line (min quantity, plan price) is added at the top. `unit_price` null means "use the current price" when a subscription is created.
- New subscriptions start today (IST) unless `startDate` is given. `next_doc_number('SUB')` uses the start date's year.
- **Line effective dates**: a line applies on day `d` when `starts_on ≤ d` (or null) and `ends_on ≥ d` (or null). `ends_on` is inclusive.
- **Running edits** (active or paused) take effect on `next_invoice_date`, the start of the next unbilled period:
  - A quantity change ends the current line the day before and inserts a copy with the new quantity, keeping its taxes. A line that hasn't started yet is edited in place.
  - Add-ons must be products of type `addon` (`ADDON_ONLY`). Removing an add-on ends it the day before, or deletes it if it hasn't started.
  - The plan line can't be removed (`PLAN_LINE_REQUIRED`) and must stay at or above `min_quantity` (`MIN_QUANTITY`).
  - Any other field returns 422 `EDIT_NOT_ALLOWED`.
- Draft or quotation edits can change every header field, and `lines` replaces the set. Changing the plan re-snapshots `billing_period` and `interval_count` and replaces the plan line.
- Transitions check rules against the lines in effect from the next billing day onward.
- Activation is allowed any time after confirmation. Billing still starts at `start_date`, because anchor = next_invoice_date = start_date.
- "Early close" means closing an active or paused subscription before `expiry_date` (or with no expiry). It needs `plan.closable`, or an admin `force`.
- **Resume**: anchor += days paused (today − paused_at). `next_invoice_date` is recomputed as period `periods_billed` from the new anchor. Expiry is not extended by the pause.
- Close sets `closed_at` = today, `close_reason` = the given `reason` or `manual`, and clears `next_invoice_date`.
- **Renewal term**: the original term is `expiry_date − start_date + 1` days, computed at the first renewal and stored in `term_days`. Each renewal adds that many days to `expiry_date`. Renewal is allowed for confirmed, active or paused subscriptions, and for subscriptions closed with reason `expired`; those reopen as active. Billing resumes from the next unbilled period, so periods missed while the subscription was closed are billed by catch-up.
- `allowedActions` lists every transition target that passes its checks for the current user, plus `edit`, `renew` and `invoice` where they apply.

## Billing, invoices, tax (phase 4)
- **Billing in advance**: each invoice covers one period. `invoice_date` = period start, and `due_date` = invoice date + payment-term days (0 without a term). A subscription is due when it is active, `next_invoice_date ≤ asOfDate`, and `next_invoice_date ≤ expiry_date` (when set).
- **Never twice, never skipped**:
  - Each subscription is billed in its own transaction under `FOR UPDATE SKIP LOCKED`.
  - The partial unique index `(subscription_id, period_start) WHERE status <> 'cancelled'` with `ON CONFLICT DO NOTHING` makes a duplicate impossible, even across processes.
  - The catch-up loop bills every period up to `asOfDate`, and periods are always computed from the anchor.
  - A unique partial index on `billing_runs (status = 'running')` lets only one run exist at a time (409). A run older than an hour that is still `running` is marked failed before a new one starts.
- Skipped means the period already had a live invoice, or the row was locked by another biller.
- The invoice number's year comes from the invoice date. A number consumed by a conflicting insert leaves a gap. This is rare, because the row lock prevents most conflicts.
- Invoices snapshot the customer (`customer_snapshot`) and the company setting (`company_snapshot`), plus each line's taxes (name, type, rate, included, amount). PDFs are built from these snapshots only.
- `invoice.auto_confirm` (default true) creates invoices as `confirmed`, otherwise as `draft`. A confirmed invoice with a total of 0 (fully discounted) is marked `paid` immediately.
- **Tax rounding**: each tax is rounded per line. Price-included percent taxes extract the net as `(amount − included fixed) / (1 + Σ included rates)`. Excluded taxes apply to the taxable amount. `taxable + tax = amount` holds exactly per line, and header totals are the sums of the rounded lines.
- Invoice discount spread: proportional to each line's net after line discounts. The last line with a positive net takes the rounding remainder, and no line's share ever exceeds its net.
- `POST /subscriptions/:id/invoices` bills exactly one period, the next unbilled one, whatever its date. It returns 422 `NOT_ACTIVE` / `PAST_EXPIRY`, or 409 if that period is already invoiced or locked.
- **Cancel**: only `draft` or `confirmed` invoices with `amount_paid = 0` (`INVOICE_HAS_PAYMENTS`). Cancelling releases discount usages but does **not** rewind the subscription, so a cancelled period stays unbilled unless an admin re-bills it by hand.
- `POST /billing/run` defaults `asOfDate` to today (IST). A future date needs `DEMO_MODE`, otherwise 422 `FUTURE_DATE_NOT_ALLOWED`. Past dates are allowed, for catch-up and seeding.

## Discounts (phase 5)
- **Stacking**: never. Each line gets at most one product discount, the largest by amount on that line (ties go to the lower id). The invoice gets at most one subscription discount, the largest by amount on the invoice net after line discounts. Neither ever exceeds its base, so no line goes negative.
- Product scope applies automatically to lines with a listed product. `min_quantity` and `min_amount` are checked against that line's quantity and subtotal.
- Subscription scope applies only while attached to the subscription. `min_quantity` is checked against the invoice's total quantity, and `min_amount` against the invoice net after line discounts.
- Eligibility uses the **invoice date** (= period start), so a discount that has expired today still applies to a back-dated catch-up period inside its window.
- **Usage counting**: one use per discount per invoice, however many lines it touched (`UNIQUE (discount_id, invoice_id)`).
  - Claiming is an atomic `UPDATE … usage_count + 1 WHERE … usage_count < usage_limit RETURNING`, done in discount-id order to avoid deadlocks.
  - A failed claim drops that discount and recomputes the pick.
  - Claims for an invoice that hits the duplicate-period conflict are released.
  - Cancelling an invoice deletes its usages and decrements `usage_count`.
- A discount that would take 0 off is not picked and not counted.
- `state` is one of `exhausted` (limit reached), `expired` (end date past), `inactive` (switched off by hand), `scheduled` (start in the future) or `active`, checked in that order.
- Once `usage_count > 0`, `type`, `value` and `scope` are locked (`DISCOUNT_IN_USE`). Name, window, limits and products stay editable. `usageLimit` can't go below `usage_count`.
- Attaching or detaching subscription discounts (`POST/DELETE /subscriptions/:id/discounts[/:discountId]`) is **admin only**, because discounts are admin-only rules. Only `subscription`-scope discounts can be attached (`DISCOUNT_SCOPE`), and not to closed subscriptions.
- The integration-test Postgres is initialised as UTF-8, matching Supabase.

## Payments and receivables (phase 6)
- Payments lock the invoice row. Only `confirmed` invoices accept payments (`INVOICE_NOT_CONFIRMED`), and `0 < amount ≤ amount_due` (`OVERPAYMENT`, with `details.amountDue`). When the amount due reaches 0, the invoice becomes `paid` with `paid_at` set.
- `paymentDate` defaults to today (IST) and cannot be in the future. Payments store `customer_id` for fast customer and portal lists.
- `DELETE /payments/:id` (admin only) subtracts the amount and returns a `paid` invoice to `confirmed`, clearing `paid_at`.
- `invoice_overview` is a `security_invoker` view. "Today" is `now() at time zone 'Asia/Kolkata'`. Invoice lists, details and receivables all read from it, so the overdue flags agree everywhere.
- Receivables only count `confirmed` invoices with an amount due. Ageing buckets are `not_due` (due today or later), `1–30`, `31–60`, `61–90` and `90+` days past the due date. "Collected this month" sums payment amounts dated from the 1st of the current IST month to today.
