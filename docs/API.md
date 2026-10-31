# Brightloop API

Base URL `/api`. JSON in and out (1 MB body limit). Every route except `GET /health` and `POST /auth/signup` needs `Authorization: Bearer <Supabase access token>`.

**Roles**: **A** admin, **S** staff, **C** customer. "Catalog" means GET for A and S, writes for A only. Customers can only use `/auth/*` and `/portal/*`.

## Conventions

- Field names are camelCase. Dates are `YYYY-MM-DD` in Asia/Kolkata. Money is a string with 2 decimals (`"1180.00"`). Ids are UUIDs.
- Single resource: `{ "data": { … } }`
- List: `{ "data": [ … ], "meta": { "page": 1, "pageSize": 25, "total": 120, … } }`
- List query: `page` (default 1), `pageSize` (default 25, max 100), `sort=field` or `sort=-field`, using the fields listed per endpoint (anything else → 400), and `search`.
- Catalog lists hide inactive rows unless `includeInactive=true`. Catalog `DELETE` is a soft delete (`isActive: false`).
- Errors: `{ "error": { "code", "message", "details" } }`

| Status | code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Bad body, query or params (`details` = zod issues) |
| 401 | `UNAUTHORIZED` | Missing, invalid or expired token, or no profile |
| 403 | `FORBIDDEN` | Wrong role or deactivated account |
| 404 | `NOT_FOUND` | Unknown id (also another customer's data in the portal) |
| 409 | `CONFLICT` | Duplicate, already invoiced, billing run already running |
| 422 | `BUSINESS_RULE` | A rule blocked the action; `details.rule` names it (below) |

**Business rule codes** (`details.rule`):
- Subscriptions: `INVALID_TRANSITION`, `NO_LINES`, `PLAN_LINE_REQUIRED`, `MIN_QUANTITY`, `QUOTE_EXPIRED`, `PLAN_UNAVAILABLE`, `PLAN_INACTIVE`, `PLAN_NOT_PAUSABLE`, `PLAN_NOT_CLOSABLE`, `PLAN_NOT_RENEWABLE`, `NO_EXPIRY`, `NOT_RENEWABLE_STATUS`, `EDIT_NOT_ALLOWED`, `ADDON_ONLY`, `CUSTOMER_INACTIVE`
- Billing: `NOT_ACTIVE`, `PAST_EXPIRY`, `FUTURE_DATE_NOT_ALLOWED`
- Invoices: `INVALID_INVOICE_STATUS`, `INVOICE_HAS_PAYMENTS`, `NOT_OVERDUE`, `NO_EMAIL`
- Payments: `INVOICE_NOT_CONFIRMED`, `OVERPAYMENT`
- Discounts: `DISCOUNT_IN_USE`, `DISCOUNT_SCOPE`, `SUBSCRIPTION_CLOSED`
- Users: `CANNOT_DEACTIVATE_SELF`, `CANNOT_CHANGE_OWN_ROLE`, `CUSTOMER_ROLE_FIXED`

---

## Health

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/health` | public | `{ status, db, serverTime, today }`, or 503 if the DB is down |

## Auth (rate limited: 20 requests / 15 min / IP)

| Method | Path | Role | Body / notes |
|---|---|---|---|
| POST | `/auth/signup` | public | `{ email, password, fullName, phone? }`. The password must match `^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$`. The role is always `customer` (a `role` field is ignored). Links an existing customer with the same email. Returns 201 with the user, 409 on a duplicate email, 400 on a weak password. The client then signs in with Supabase. |
| GET | `/auth/me` | any | `{ id, email, fullName, role, isActive, customerId }` |
| PATCH | `/auth/me` | any | `{ fullName }` |
| POST | `/auth/change-password` | any | `{ password }`, same rule as signup |

Forgot-password emails are sent client-side with Supabase (`resetPasswordForEmail`, redirect `APP_URL/reset-password`).

## Users (A)

| Method | Path | Body / query |
|---|---|---|
| GET | `/users` | `role`, `isActive`, `search`. Sort: `createdAt`, `email`, `fullName`, `role` |
| POST | `/users/staff` | `{ email, fullName }`. Creates a staff login and emails a password-setup link. Response includes `passwordEmailSent`. |
| PATCH | `/users/:id` | `{ fullName?, role? (admin\|staff), isActive? }`. You can't deactivate yourself or change your own role. |

## Customers (A, S)

| Method | Path | Body / query |
|---|---|---|
| GET | `/customers` | `search` (trigram on name, plus email), `hasPortal`, `includeInactive`. Sort: `name`, `email`, `createdAt`. Rows include `hasPortal` and `activeSubscriptions`. |
| POST | `/customers` | `{ name, email, phone?, billingAddress?, gstin? }`. GSTIN is 15 alphanumerics. 409 on a duplicate email. |
| GET | `/customers/:id` | Adds `activeSubscriptions`, `pausedSubscriptions`, `totalSubscriptions`, `outstandingInvoices`, `outstandingAmount`, `overdueInvoices`, `overdueAmount` |
| PATCH | `/customers/:id` | Any create field plus `isActive`. The email is fixed once a portal login exists. |
| POST | `/customers/:id/invite` | Creates a portal login and emails a password-setup link. 409 if one exists. |

## Catalog

### Products
| Method | Path | Body / query |
|---|---|---|
| GET | `/products` | `type`, `search`, `includeInactive`. Sort: `name`, `salesPrice`, `type`, `createdAt` |
| POST | `/products` | `{ name, type (service\|goods\|addon), salesPrice, costPrice?, notes?, taxIds? }` |
| GET | `/products/:id` | Includes `variants[]` (`{ id, name, sku, values[{attribute, value, extraPrice}], price }`, where price = salesPrice + Σ extras) and `taxes[]` |
| PATCH / DELETE | `/products/:id` | Partial update / soft delete |
| POST | `/products/:id/variants` | `{ attributeValueIds[], sku? }`. One value per attribute. The name is generated (`CRM Suite (Odoo)`). 409 on a duplicate combination. |
| PATCH | `/products/:id/variants/:variantId` | `{ sku?, isActive? }` |
| PUT | `/products/:id/taxes` | `{ taxIds[] }` replaces the set |

### Attributes
| Method | Path | Body |
|---|---|---|
| GET | `/attributes` | Each attribute with its `values[]` |
| POST | `/attributes` | `{ name, values?: [{ value, extraPrice }] }` |
| GET / PATCH | `/attributes/:id` | `{ name?, isActive? }` |
| POST | `/attributes/:id/values` | `{ value, extraPrice }`. 409 on a duplicate value. |

### Plans
| Method | Path | Body / query |
|---|---|---|
| GET | `/plans` | `available=true` (active and inside its availability window today), `productId`, `billingPeriod`, `search`. Sort: `name`, `price`, `billingPeriod`, `createdAt` |
| POST | `/plans` | `{ name, productId, price, billingPeriod (daily\|weekly\|monthly\|yearly), intervalCount=1, minQuantity=1, availableFrom?, availableTo?, autoClose=false, closable=true, pausable=false, renewable=false }` |
| GET / PATCH / DELETE | `/plans/:id` | Edits never change existing subscriptions or invoices |

### Taxes, payment terms
| Method | Path | Body |
|---|---|---|
| GET / POST | `/taxes` | `{ name, type (percent\|fixed), rate, priceIncluded=false }`. A percent rate is a percentage (18 = 18 %, max 100). |
| GET / PATCH / DELETE | `/taxes/:id` | |
| GET / POST | `/payment-terms` | `{ name, dueDays }` |
| GET / PATCH / DELETE | `/payment-terms/:id` | |

### Quotation templates
| Method | Path | Body |
|---|---|---|
| GET / POST | `/templates` | `{ name, planId, paymentTermId?, validityDays=30, notes?, lines: [{ productId, variantId?, quantity, unitPrice? (null = current price), description? }] }` |
| GET / PATCH / DELETE | `/templates/:id` | `lines`, when given, replaces the set |

### Settings
| Method | Path | Body |
|---|---|---|
| GET | `/settings` | `[{ key, value }]` |
| PUT | `/settings/:key` | `company`: `{ value: { name, address, email, phone, gstin } }`. `invoice.auto_confirm`: `{ value: true\|false }`. |

### Discounts
| Method | Path | Body / query |
|---|---|---|
| GET | `/discounts` | `state` (`scheduled\|active\|expired\|exhausted\|inactive`), `scope`, `search`. Sort: `name`, `createdAt`, `endDate`, `usageCount`. Rows include `state` and `productIds`. |
| POST | `/discounts` | `{ name, type (percent\|fixed), value, scope (product\|subscription), minAmount?, minQuantity?, startDate?, endDate?, usageLimit?, productIds[] }`. `endDate ≥ startDate`. Product scope needs products. A percent value is at most 100. |
| GET | `/discounts/:id` | Adds `products[]` and `totalDiscounted` |
| PATCH / DELETE | `/discounts/:id` | Once used, `type`, `value` and `scope` are locked (`DISCOUNT_IN_USE`) |

## Subscriptions (A, S)

| Method | Path | Body / query |
|---|---|---|
| GET | `/subscriptions` | `status` (comma list), `customerId`, `planId`, `startFrom`, `startTo`, `search` (number, customer name or email). Sort: `createdAt`, `number`, `startDate`, `expiryDate`, `nextInvoiceDate`, `customerName`, `status`. `meta.statusCounts` ignores the status filter. Rows include `recurringAmount`. |
| POST | `/subscriptions` | `{ customerId, planId \| templateId, startDate? (today), expiryDate?, quoteValidUntil?, paymentTermId?, salespersonId?, notes? }`. From a template it copies the plan, term and lines, with `quoteValidUntil` = today + validity. Otherwise it adds a plan line (min quantity, plan price). Starts as `draft` with number `SUB/2026/00001`. |
| GET | `/subscriptions/:id` | Includes `plan` (flags), `lines[]` (taxes, `startsOn`/`endsOn`, `isCurrent`), `mrr`, `totals` (next-invoice preview: `periodStart`, `periodEnd`, `subtotal`, `discountTotal`, `taxTotal`, `total`), `history[]`, `recentInvoices[]`, `discounts[]`, `allowedActions[]` (transition targets plus `edit`, `renew`, `invoice`) |
| PATCH | `/subscriptions/:id` | **Draft / quotation**: `{ customerId?, planId?, startDate?, expiryDate?, quoteValidUntil?, paymentTermId?, salespersonId?, notes?, lines? }` (lines replace the set). **Active / paused**: `{ quantities?: [{ lineId, quantity }], addAddons?: [{ productId, variantId?, quantity }], removeLineIds?: [], notes? }`, effective from the next invoice date. Otherwise 422 `EDIT_NOT_ALLOWED`. |
| POST | `/subscriptions/:id/transition` | `{ to, note?, reason?, force? }`. Allowed: draft → quotation/closed; quotation → confirmed/draft/closed; confirmed → active/closed; active → paused/closed; paused → active/closed. `force` (admin only) allows an early close on a non-closable plan. |
| POST | `/subscriptions/:id/renew` | Needs a renewable plan and an expiry date. Adds the original term to the expiry and reopens a subscription closed as `expired`. |
| POST | `/subscriptions/:id/invoices` | Bills the next period now. Returns the invoice (201). 409 if already invoiced. |
| POST | `/subscriptions/:id/discounts` | **A** only. `{ discountId }`, subscription-scope discounts only. 409 if already attached. |
| DELETE | `/subscriptions/:id/discounts/:discountId` | **A** only |

Side effects of `transition`:
- → active: anchor = next invoice date = start date.
- → paused: `pausedAt` = today.
- Resume: the anchor shifts by the paused days.
- → closed: `closedAt` and `closeReason` are set, and the next invoice date is cleared.

## Billing

| Method | Path | Role | Body / notes |
|---|---|---|---|
| POST | `/billing/run` | A | `{ asOfDate? }` (default today; a future date needs `DEMO_MODE`). Returns the run (201): `{ id, asOfDate, status, due, generated, skipped, failed, errors[] }`. 409 while another run is running. A second run for the same date reports `generated: 0`. |
| GET | `/billing/runs` | A, S | Newest first |
| GET | `/billing/runs/:id` | A, S | Adds `invoiceCount` |

## Invoices (A, S)

| Method | Path | Body / query |
|---|---|---|
| GET | `/invoices` | `status` (comma list), `overdue=true\|false`, `customerId`, `subscriptionId`, `from`/`to` (invoice date), `search` (number, customer, subscription number). Sort: `number`, `invoiceDate`, `dueDate`, `total`, `amountDue`, `customerName`, `status`, `createdAt`. `meta.statusCounts` and `meta.totals { total, amountPaid, amountDue }`. Rows include `isOverdue` and `daysOverdue`. **`format=csv`** downloads the filtered list. |
| GET | `/invoices/:id` | Includes `lines[]` (with tax snapshots), `payments[]`, `discounts[]`, the customer and company snapshots, and the overdue flags |
| GET | `/invoices/:id/pdf` | `application/pdf` |
| POST | `/invoices/:id/confirm` | draft → confirmed |
| POST | `/invoices/:id/cancel` | Only with `amountPaid = 0`. Frees discount usages. The subscription is not rewound. |
| POST | `/invoices/:id/send` | Confirms a draft, emails the PDF (logged if SMTP is off), sets `sentAt`. Response includes `email { delivered, logged }`. |
| POST | `/invoices/send-bulk` | `{ invoiceIds[] }` (max 100) → `{ sent, failed, results[] }` |
| POST | `/invoices/:id/remind` | Overdue invoices only |
| POST | `/invoices/:id/payments` | `{ method (cash\|bank_transfer\|upi\|card\|cheque\|other), amount, paymentDate? (today, not in the future), note? }`. The invoice must be confirmed and `0 < amount ≤ amountDue`. It becomes `paid` when nothing is left due. Returns the updated invoice (201). |

## Payments

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/payments` | A, S | `invoiceId`, `customerId`, `method`, `from`, `to`, `search`. Sort: `paymentDate`, `amount`, `createdAt`, `customerName`. `meta.totalAmount`. |
| DELETE | `/payments/:id` | A | Reverts a paid invoice to confirmed |

## Receivables (A, S)

| Method | Path | Notes |
|---|---|---|
| GET | `/receivables/summary` | `{ outstanding, outstandingCount, overdueCount, overdueAmount, collectedThisMonth, ageing: { notDue, days130, days3160, days6190, days90Plus } }`. Each bucket is `{ count, amount }`. |
| GET | `/receivables/overdue` | Overdue invoices with customer contact details. `customerId`, `search`. Sort: `daysOverdue` (default, descending), `amountDue`, `dueDate`. |

## Reports (A, S)

Filters: `from`, `to` (default: 1st of the month → today), `planId`, `customerId`.

| Method | Path | Returns |
|---|---|---|
| GET | `/reports/summary` | `{ from, to, activeSubscriptions, pausedSubscriptions, mrr, arr, invoiced, collected, outstanding, overdue, overdueInvoices, newSubscriptions, churnedSubscriptions }` |
| GET | `/reports/revenue-trend` | `months` (1–60, default 12) → `[{ month: "2026-01", invoiced, invoices, collected }]`, with empty months included |
| GET | `/reports/by-plan` | `{ from, to, rows: [{ planId, planName, billingPeriod, activeSubscriptions, pausedSubscriptions, mrr, invoiced }] }` |
| GET | `/reports/top-customers` | `limit` (default 10) → `{ from, to, rows: [{ customerId, name, invoiced, paid, outstanding, invoices }] }` |

## Jobs (A)

| Method | Path | Body |
|---|---|---|
| POST | `/jobs/:name/run` | `name` is `daily` (all five, in order) or one of `expire-quotations`, `activate-subscriptions`, `run-billing`, `auto-close`, `deactivate-discounts`. `{ asOfDate? }`, future only with `DEMO_MODE`. Returns `{ asOfDate, results: { <job>: { processed, failed, errors } } }`. |

The same jobs run every day at 00:05 Asia/Kolkata when `JOBS_ENABLED=true`.

## Portal (C)

Everything is scoped to the signed-in customer. Other customers' ids and internal drafts return **404**.

| Method | Path | Body / notes |
|---|---|---|
| GET | `/portal/overview` | Counts, next invoice date, outstanding and overdue amounts, 5 recent invoices |
| GET | `/portal/subscriptions` | Same filters as staff (drafts excluded) |
| GET | `/portal/subscriptions/:id` | Detail. `allowedActions` ⊂ `pause, resume, cancel, renew, addons` |
| POST | `/portal/subscriptions/:id/pause` | `{ note? }`. Active only, and the plan must be pausable. |
| POST | `/portal/subscriptions/:id/resume` | `{ note? }`. Paused only. |
| POST | `/portal/subscriptions/:id/cancel` | `{ note? }`. Active or paused, and the plan must be closable (before expiry). Reason `customer_cancelled`. |
| POST | `/portal/subscriptions/:id/renew` | Same rules as staff |
| POST | `/portal/subscriptions/:id/addons` | `{ add?: [{ productId, variantId?, quantity }], remove?: [lineId] }`. Add-on products only, effective next period. |
| GET | `/portal/invoices` | Same filters as staff (drafts excluded) |
| GET | `/portal/invoices/:id` | Detail with lines, payments and discounts |
| GET | `/portal/invoices/:id/pdf` | `application/pdf` |
| GET | `/portal/payments` | Own payments |
| GET / PATCH | `/portal/profile` | PATCH `{ fullName?, name?, phone?, billingAddress?, gstin? }`. The email can't be changed. |
