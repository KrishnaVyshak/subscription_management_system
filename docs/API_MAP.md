# API map (frontend view)

Derived from `backend/src/routes.js`, every `backend/src/modules/*/routes.js` + `schemas.js`,
`backend/src/jobs/routes.js`, and live responses from the seeded database. Where this differs from
`docs/API.md` or the frontend spec, **the code wins** and the difference is noted (⚠).

Base `/api`. Roles: **A** admin, **S** staff, **C** customer. "Cat" = catalog access: GET for A+S,
writes for A only (`catalogAccess`).

## Conventions

- **Envelope**: single `{ data }`; list `{ data: [], meta: { page, pageSize, total, …extra } }`.
  ⚠ `GET /attributes`, `GET /settings`, `GET /reports/*` return `{ data }` with **no meta** (not
  paginated).
- **List query** (`listQuerySchema`): `page` ≥1 (1), `pageSize` 1–100 (25), `sort=field|-field`
  (whitelist per endpoint; anything else → 400 with `details.allowed`), `search` (trimmed, min 1).
- Booleans in the query string use `z.stringbool()`: `true/false/1/0/yes/no`.
- **Money** in: string or number with ≤2 decimals, non-negative (`"1000"`, `1000.5`). Out: always a
  string with 2 decimals (`"1180.00"`). Rates (taxes) out with 4 decimals (`"18.0000"`).
- **Dates** `YYYY-MM-DD` (Asia/Kolkata business date). Timestamps are ISO strings.
- Field names camelCase in and out. Unknown body keys are stripped.
- **Catalog delete** = soft delete (`isActive: false`); lists hide inactive rows unless
  `includeInactive=true`.

## Errors

`{ error: { code, message, details } }`

| HTTP | code | details | UI handling |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | zod issues `[{ path: [..], message, code }]` **or** a plain object (`{ line, productId }`, `{ allowed }`, `{ constraint }`) | `path[0]` (joined with `.`) → RHF `setError`; otherwise toast `message` |
| 400 | `BAD_JSON` | — | toast |
| 401 | `UNAUTHORIZED` | — | refresh session once, retry; then sign out → `/login` |
| 403 | `FORBIDDEN` | — | toast "You don't have access"; page loads → `/403` |
| 404 | `NOT_FOUND` | — | not-found state |
| 409 | `CONFLICT` | sometimes `{ constraint, detail }` | toast with `message` (contextual copy where known) |
| 422 | `BUSINESS_RULE` | `{ rule, … }` | toast with the friendly message for `rule` (table below) |
| 429 | (express-rate-limit, plain text) | — | toast "Too many attempts, wait a few minutes" |
| 500 | `INTERNAL` | — | toast "Something went wrong" |
| 502 | `AUTH_PROVIDER_ERROR` | — | toast "The sign-in service is unavailable" |

### Business rule codes (`details.rule`), complete list from the code

| Rule | Where | Friendly message |
|---|---|---|
| `INVALID_TRANSITION` | subscription transition | This change isn't allowed from the current status. |
| `NO_LINES` | → quotation/confirmed | Add at least one line before continuing. |
| `PLAN_LINE_REQUIRED` | lines | The plan's own product must stay on the subscription. |
| `MIN_QUANTITY` | lines / transition | The plan needs a higher quantity on its product line. |
| `QUOTE_EXPIRED` | → confirmed | This quotation has expired. Send a new one. |
| `PLAN_UNAVAILABLE` | create / transition | This plan isn't available on the chosen dates. |
| `PLAN_INACTIVE` | create / transition | This plan is no longer offered. |
| `PLAN_NOT_PAUSABLE` | → paused | This plan can't be paused. |
| `PLAN_NOT_CLOSABLE` | → closed | This plan can't be closed before it expires. |
| `PLAN_NOT_RENEWABLE` | renew | This plan isn't renewable. |
| `NO_EXPIRY` | renew | Only subscriptions with an expiry date can be renewed. |
| `NOT_RENEWABLE_STATUS` | renew | A subscription in this status can't be renewed. |
| `EDIT_NOT_ALLOWED` | PATCH | This subscription can't be edited in its current status. |
| `ADDON_ONLY` | active edit / portal add-ons | Only add-on products can be added to a running subscription. |
| `CUSTOMER_INACTIVE` | create / edit | This customer is inactive. |
| `NOT_ACTIVE` | invoice now | Only active subscriptions can be invoiced. |
| `PAST_EXPIRY` | invoice now / billing | The next period starts after the expiry date. |
| `FUTURE_DATE_NOT_ALLOWED` | billing run / jobs | Future dates need demo mode on the server. |
| `INVALID_INVOICE_STATUS` | confirm/cancel/send | The invoice is not in a status that allows this. |
| `INVOICE_HAS_PAYMENTS` | cancel | Remove its payments before cancelling this invoice. |
| `NOT_OVERDUE` | remind | Only overdue invoices get reminders. |
| `NO_EMAIL` | send / remind | The customer has no email address. |
| `INVOICE_NOT_CONFIRMED` | record payment | Payments can only be recorded on confirmed invoices. |
| `OVERPAYMENT` | record payment | The amount is more than what is due. |
| `DISCOUNT_IN_USE` | discount PATCH | This discount has been used, so its type, value and scope are locked. |
| `DISCOUNT_SCOPE` | attach | Only subscription-scope discounts can be attached. |
| `SUBSCRIPTION_CLOSED` | attach | A closed subscription can't get discounts. |
| `CANNOT_DEACTIVATE_SELF` | users | You can't deactivate your own account. |
| `CANNOT_CHANGE_OWN_ROLE` | users | You can't change your own role. |
| `CUSTOMER_ROLE_FIXED` | users | Customer accounts can't be given a staff role. |

---

## Health

| Method | Path | Role | Response |
|---|---|---|---|
| GET | `/health` | public | `{ status, db: 'up'\|'down', serverTime, today, dbError? }` (503 when DB down) |

## Auth: ⚠ the whole `/api/auth/*` prefix is rate-limited to 20 req / 15 min / IP, including `/auth/me`

| Method | Path | Role | Body | Response |
|---|---|---|---|---|
| POST | `/auth/signup` | public | `{ email, password (PASSWORD_REGEX), fullName (1–200), phone? (≤30) }` | 201 user; 409 duplicate email |
| GET | `/auth/me` | any | — | `{ id, email, fullName, role, isActive, customerId }` |
| PATCH | `/auth/me` | any | `{ fullName }` | user |
| POST | `/auth/change-password` | any | `{ password }` | ok |

## Users (A)

| Method | Path | Params / body | Response |
|---|---|---|---|
| GET | `/users` | `role` (admin\|staff\|customer), `isActive`, `search`; sort `createdAt,email,fullName,role` | `[{ id, email, fullName, role, isActive, createdAt, updatedAt }]` + meta |
| POST | `/users/staff` | `{ email, fullName }` | user + `passwordEmailSent` (201) |
| PATCH | `/users/:id` | `{ fullName?, role? (admin\|staff), isActive? }` (≥1 key) | user |

## Customers (A, S)

| Method | Path | Params / body | Response |
|---|---|---|---|
| GET | `/customers` | `search`, `hasPortal`, `includeInactive`; sort `name,email,createdAt` | `[{ id, profileId, name, email, phone, billingAddress, gstin, isActive, createdAt, updatedAt, hasPortal, activeSubscriptions }]` + meta |
| POST | `/customers` | `{ name, email, phone?, billingAddress?, gstin? (15 [0-9A-Z]) }` | customer (201); 409 duplicate email |
| GET | `/customers/:id` | — | customer + `pausedSubscriptions, totalSubscriptions, outstandingInvoices, outstandingAmount, overdueInvoices, overdueAmount` |
| PATCH | `/customers/:id` | any create field (nullable) + `isActive` | customer; 409 if email changes with a portal login |
| POST | `/customers/:id/invite` | — | portal login created + email; 409 if exists |

## Catalog

### Products (Cat)
| Method | Path | Params / body | Response |
|---|---|---|---|
| GET | `/products` | `type` (service\|goods\|addon), `search`, `includeInactive`; sort `name,salesPrice,type,createdAt` | `[{ id, name, type, salesPrice, costPrice, notes, isActive, createdAt, updatedAt, variantCount }]` + meta |
| POST | `/products` | `{ name, type='service', salesPrice, costPrice='0', notes?, isActive?, taxIds? }` | product (201) |
| GET | `/products/:id` | — | product + `variants[{ id, productId, name, sku, isActive, price, values[{ id, attributeId, attribute, value, extraPrice }] }]`, `taxes[tax]` |
| PATCH | `/products/:id` | partial `{ name, type, salesPrice, costPrice, notes, isActive }` | product |
| DELETE | `/products/:id` | — | soft delete |
| PUT | `/products/:id/taxes` | `{ taxIds[] }` (replaces) | product |
| POST | `/products/:id/variants` | `{ attributeValueIds[] (≥1, one per attribute), sku? }` | variant (201); 409 duplicate combination |
| PATCH | `/products/:id/variants/:variantId` | `{ sku?, isActive? }` | variant |

### Attributes (Cat)
| Method | Path | Params / body | Response |
|---|---|---|---|
| GET | `/attributes` | `includeInactive` | ⚠ `{ data: [{ id, name, isActive, values[{ id, value, extraPrice, isActive }] }] }` (no meta) |
| POST | `/attributes` | `{ name, values?: [{ value, extraPrice='0' }] }` | attribute (201) |
| GET | `/attributes/:id` | — | attribute |
| PATCH | `/attributes/:id` | `{ name?, isActive? }` | attribute |
| POST | `/attributes/:id/values` | `{ value, extraPrice }` | value (201); 409 duplicate |

⚠ There is no endpoint to edit or delete an attribute **value**, so "inline editable values" means
add-only plus attribute rename/deactivate.

### Plans (Cat)
| Method | Path | Params / body | Response |
|---|---|---|---|
| GET | `/plans` | `available`, `productId`, `billingPeriod`, `search`, `includeInactive`; sort `name,price,billingPeriod,createdAt` | `[{ id, name, productId, productName, price, billingPeriod, intervalCount, minQuantity, availableFrom, availableTo, autoClose, closable, pausable, renewable, isActive, … }]` + meta |
| POST | `/plans` | `{ name, productId, price, billingPeriod, intervalCount=1 (1–365), minQuantity=1, availableFrom?, availableTo? (≥ from), autoClose=false, closable=true, pausable=false, renewable=false, isActive? }` | plan (201) |
| GET | `/plans/:id` | — | plan + `productName, productType` |
| PATCH / DELETE | `/plans/:id` | partial of the above / — | plan |

### Taxes (Cat)
| Method | Path | Params / body | Response |
|---|---|---|---|
| GET | `/taxes` | `search`, `includeInactive`; sort `name,rate,createdAt` | `[{ id, name, type, rate, priceIncluded, isActive, … }]` + meta |
| POST | `/taxes` | `{ name, type (percent\|fixed), rate (percent ≤100), priceIncluded=false, isActive? }` | tax (201) |
| GET / PATCH / DELETE | `/taxes/:id` | partial | tax |

### Payment terms (Cat)
| Method | Path | Params / body | Response |
|---|---|---|---|
| GET | `/payment-terms` | `search`, `includeInactive`; sort `name,dueDays,createdAt` (default dueDays asc) | `[{ id, name, dueDays, isActive, … }]` + meta |
| POST | `/payment-terms` | `{ name, dueDays (0–3650), isActive? }` | term (201) |
| GET / PATCH / DELETE | `/payment-terms/:id` | partial | term |

### Settings (Cat)
| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/settings` | — | ⚠ `{ data: [{ key, value, updatedAt }] }` keys `company`, `invoice.auto_confirm`, … |
| PUT | `/settings/:key` | `company`: `{ value: { name (req), address, email, phone, gstin } }`; `invoice.auto_confirm`: `{ value: boolean }` | `{ key, value, updatedAt }` |

### Quotation templates (Cat)
| Method | Path | Params / body | Response |
|---|---|---|---|
| GET | `/templates` | `search`, `includeInactive` | `[{ id, name, planId, planName, paymentTermId, paymentTermName, validityDays, notes, isActive, lineCount }]` + meta |
| POST | `/templates` | `{ name, planId, paymentTermId?, validityDays=30 (0–3650), notes?, isActive?, lines: [{ productId, variantId?, quantity ≥1, unitPrice? (null = current price), description? }] }` | template (201) |
| GET | `/templates/:id` | — | template + `lines[{ id, productId, productName, productType, variantId, variantName, description, quantity, unitPrice, sortOrder }]` |
| PATCH / DELETE | `/templates/:id` | partial; `lines` replaces the set | template |

### Discounts (Cat)
| Method | Path | Params / body | Response |
|---|---|---|---|
| GET | `/discounts` | `state` (scheduled\|active\|expired\|exhausted\|inactive), `scope`, `search`; sort `name,createdAt,endDate,usageCount` | `[{ id, name, type, value, scope, minAmount, minQuantity, startDate, endDate, usageLimit, usageCount, isActive, state, productIds[] }]` + meta |
| POST | `/discounts` | `{ name, type, value (>0; percent ≤100), scope, minAmount?, minQuantity?, startDate?, endDate? (≥ start), usageLimit?, isActive?, productIds[] (product scope needs ≥1) }` | discount (201) |
| GET | `/discounts/:id` | — | discount + `products[]`, `totalDiscounted` |
| PATCH | `/discounts/:id` | partial; `type,value,scope` locked once used (`DISCOUNT_IN_USE`); `usageLimit` ≥ usageCount | discount |
| DELETE | `/discounts/:id` | — | soft delete |

## Subscriptions (A, S)

| Method | Path | Params / body | Response |
|---|---|---|---|
| GET | `/subscriptions` | `status` (comma list), `customerId`, `planId`, `startFrom`, `startTo`, `search`; sort `createdAt,number,startDate,expiryDate,nextInvoiceDate,customerName,status` | `[{ id, number, status, planId, planName, customerId, customerName, startDate, expiryDate, nextInvoiceDate, quoteValidUntil, billingPeriod, intervalCount, recurringAmount, createdAt }]` + `meta.statusCounts` (ignores status filter; zero statuses omitted) |
| POST | `/subscriptions` | `{ customerId, planId \| templateId, startDate?, expiryDate?, quoteValidUntil?, paymentTermId?, salespersonId?, notes? }` | subscription (201, `draft`) |
| GET | `/subscriptions/:id` | — | see **Subscription detail** |
| PATCH | `/subscriptions/:id` | draft/quotation: `{ customerId?, planId?, startDate?, expiryDate?, quoteValidUntil?, paymentTermId?, salespersonId?, notes?, lines? }`; active/paused: `{ quantities?: [{ lineId, quantity }], addAddons?: [{ productId, variantId?, quantity }], removeLineIds?: [], notes? }` | detail |
| POST | `/subscriptions/:id/transition` | `{ to, note?, reason? (≤100), force? (A) }` | detail |
| POST | `/subscriptions/:id/renew` | — | detail |
| POST | `/subscriptions/:id/invoices` | — | invoice (201); 409 already invoiced |
| POST | `/subscriptions/:id/discounts` | **A**. `{ discountId }` | detail; 409 already attached |
| DELETE | `/subscriptions/:id/discounts/:discountId` | **A** | detail |

**Subscription detail**: all list fields + `templateId, termDays, billingAnchorDate, periodsBilled,
paymentTermId, paymentTermName, dueDays, salespersonId, salespersonName, notes, pausedAt, closedAt,
closeReason, customerEmail`, plus:
- `plan { id, name, price, minQuantity, autoClose, closable, pausable, renewable }`
- `lines[{ id, productId, productName, productType, variantId, description, quantity, unitPrice,
  isPlanLine, startsOn, endsOn, isCurrent, taxes[{ id, name, type, rate, priceIncluded }] }]`
- `mrr`, `totals { periodStart, periodEnd, invoiceDate, subtotal, discountTotal, taxTotal, total }`
- `history[{ id, fromStatus, toStatus, note, createdAt, changedBy, changedByName }]`
- `recentInvoices[]`, `discounts[{ id, name, type, value, scope, startDate, endDate, usageLimit,
  usageCount, isActive, attachedAt }]`
- `allowedActions[]`: transition targets that pass the rules (`quotation, confirmed, draft, active,
  paused, closed`) **plus** `edit` (draft/quotation/active/paused), `renew`, `invoice` (active).
  UI mapping: draft→quotation "Send quotation", quotation→confirmed "Confirm", quotation→draft
  "Back to draft", confirmed→active "Activate", active→paused "Pause", paused→active "Resume",
  →closed "Close", `renew` "Renew", `invoice` "Invoice now".

⚠ Line **taxes are not settable per line**: lines inherit the product's taxes (`lineResolver`). The
LinesEditor shows them read-only. Line `unitPrice` null = computed (plan price for the plan product,
else sales price, plus variant extras).

## Billing

| Method | Path | Role | Body | Response |
|---|---|---|---|---|
| POST | `/billing/run` | A | `{ asOfDate? }` (future → 422 `FUTURE_DATE_NOT_ALLOWED` unless DEMO_MODE) | run (201) `{ id, asOfDate, status, due, generated, skipped, failed, errors[] }`; 409 while running |
| GET | `/billing/runs` | A, S | page/pageSize | `[{ id, asOfDate, source, startedAt, finishedAt, status, due, generated, skipped, failed, errors[], triggeredByName }]` + meta |
| GET | `/billing/runs/:id` | A, S | — | run + `invoiceCount` |

⚠ Invoices have no `billingRunId` filter in `GET /invoices`, so "Send all new invoices" after a run
uses `status=draft&from=<asOfDate>&to=<asOfDate>`, and sends the drafts dated on that day.

## Invoices (A, S)

| Method | Path | Params / body | Response |
|---|---|---|---|
| GET | `/invoices` | `status` (comma list of draft,confirmed,paid,cancelled), `overdue`, `customerId`, `subscriptionId`, `from`, `to` (invoice date), `search`; sort `number,invoiceDate,dueDate,total,amountDue,customerName,status,createdAt`; `format=csv` | `[{ id, number, status, customerId, customerName, subscriptionId, subscriptionNumber, invoiceDate, dueDate, periodStart, periodEnd, subtotal, discountTotal, taxTotal, total, amountPaid, amountDue, isOverdue, daysOverdue, sentAt, paidAt, confirmedAt, cancelledAt, billingRunId }]` + `meta.statusCounts`, `meta.totals { total, amountPaid, amountDue }` |
| GET | `/invoices/:id` | — | row + `customerSnapshot { name, email, billingAddress, … }`, `companySnapshot { name, address, email, phone, gstin }`, `lines[{ id, description, quantity, unitPrice, lineSubtotal, discountAmount, taxableAmount, taxAmount, amount, taxes[{ taxName, type, rate, priceIncluded, amount }] }]`, `payments[]`, `discounts[{ discountId, name, type, value, scope, amount }]` |
| GET | `/invoices/:id/pdf` | — | `application/pdf` |
| POST | `/invoices/:id/confirm` | — | detail |
| POST | `/invoices/:id/cancel` | — | detail (`INVOICE_HAS_PAYMENTS`) |
| POST | `/invoices/:id/send` | — | detail + `email { delivered, logged }` |
| POST | `/invoices/send-bulk` | `{ invoiceIds[] (1–100) }` | `{ sent, failed, results[{ id, ok, number?, email?, error? }] }` |
| POST | `/invoices/:id/remind` | — | `{ id, number, email }` |
| POST | `/invoices/:id/payments` | `{ method, amount (>0), paymentDate? (≤ today), note? }` | updated invoice (201) |

⚠ `meta.statusCounts` has no overdue count; the Overdue tab count is a second `overdue=true&pageSize=1`
query.

## Payments

| Method | Path | Role | Params | Response |
|---|---|---|---|---|
| GET | `/payments` | A, S | `invoiceId`, `customerId`, `method`, `from`, `to`, `search`; sort `paymentDate,amount,createdAt,customerName` | `[{ id, invoiceId, invoiceNumber, customerId, customerName, method, amount, paymentDate, note, recordedByName, createdAt }]` + `meta.totalAmount` |
| DELETE | `/payments/:id` | A | — | deleted payment; a paid invoice reverts to confirmed |

## Receivables (A, S)

| Method | Path | Params | Response |
|---|---|---|---|
| GET | `/receivables/summary` | — | `{ outstanding, outstandingCount, overdueCount, overdueAmount, collectedThisMonth, ageing: { notDue, days130, days3160, days6190, days90Plus } }` (each `{ count, amount }`) |
| GET | `/receivables/overdue` | `customerId`, `search`; sort `daysOverdue,amountDue,dueDate` (default daysOverdue desc) | `[{ id, number, customerId, customerName, customerEmail, customerPhone, subscriptionId, invoiceDate, dueDate, total, amountPaid, amountDue, daysOverdue, sentAt }]` + meta |

⚠ The receivables endpoints take no date, plan or customer filters (except `customerId` on overdue),
so dashboard filters do not change the ageing chart.

## Reports (A, S)

Filters: `from`, `to` (default first of month → today; `from ≤ to`), `planId`, `customerId`.

| Method | Path | Response |
|---|---|---|
| GET | `/reports/summary` | `{ from, to, activeSubscriptions, pausedSubscriptions, mrr, arr, invoiced, collected, outstanding, overdue, overdueInvoices, newSubscriptions, churnedSubscriptions }` |
| GET | `/reports/revenue-trend` | ⚠ takes `months` (1–60, 12), `planId`, `customerId`, **not** from/to → `[{ month: 'YYYY-MM', invoiced, invoices, collected }]` |
| GET | `/reports/by-plan` | `{ from, to, rows[{ planId, planName, billingPeriod, activeSubscriptions, pausedSubscriptions, mrr, invoiced }] }` |
| GET | `/reports/top-customers` | `limit` (10) → `{ from, to, rows[{ customerId, name, invoiced, paid, outstanding, invoices }] }` |

## Jobs (A)

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/jobs/:name/run` | name ∈ `daily, expire-quotations, activate-subscriptions, run-billing, auto-close, deactivate-discounts`; `{ asOfDate? }` | `{ asOfDate, results: { <job>: { processed, failed, errors } } }` |

## Portal (C): everything is scoped to `req.user.customerId`; other ids return 404

| Method | Path | Params / body | Response |
|---|---|---|---|
| GET | `/portal/overview` | — | `{ id, name, email, activeSubscriptions, pausedSubscriptions, nextInvoiceDate, outstandingAmount, overdueInvoices, overdueAmount, today, recentInvoices[invoice row] }` |
| GET | `/portal/subscriptions` | same as staff list | rows + `statusCounts` (drafts excluded) |
| GET | `/portal/subscriptions/:id` | — | staff detail minus `createdBy, salespersonId, notes`; `allowedActions` ⊂ `pause, resume, cancel, renew, addons` |
| POST | `/portal/subscriptions/:id/pause` \| `/resume` \| `/cancel` | `{ note? }` | detail |
| POST | `/portal/subscriptions/:id/renew` | — | detail |
| POST | `/portal/subscriptions/:id/addons` | `{ add?: [{ productId, variantId?, quantity=1 }], remove?: [lineId] }` (≥1 change) | detail |
| GET | `/portal/invoices` | same as staff list | rows + `statusCounts`, `totals` (drafts excluded) |
| GET | `/portal/invoices/:id` | — | invoice detail |
| GET | `/portal/invoices/:id/pdf` | — | PDF |
| GET | `/portal/payments` | same as staff list | rows + `totalAmount` |
| GET | `/portal/profile` | — | `{ customerId, name, email, phone, billingAddress, gstin, fullName, loginEmail }` |
| PATCH | `/portal/profile` | `{ fullName?, name?, phone?, billingAddress?, gstin? }` (≥1) | profile |

⚠ The portal has no product list for "Manage add-ons", and customers get 403 on `/products`. The
portal can remove the add-on lines it already has, but it has no list of add-ons to offer for adding
(BACKEND_ISSUES #4).

## Screen usage (filled in as phases land)

Every endpoint above is used by a screen except: `GET /attributes/:id` (the list already embeds
values), `GET /health` (status page only), `PATCH /auth/me` (the portal profile PATCH covers name),
`GET /reports/top-customers` (dashboard table, phase 7). Final list in `docs/FRONTEND_DECISIONS.md`.
