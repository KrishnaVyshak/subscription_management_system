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
