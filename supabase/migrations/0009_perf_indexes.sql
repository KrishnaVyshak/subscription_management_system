-- Indexes found with EXPLAIN ANALYZE on the large seed (10k subscriptions, ~100k invoices).

-- Default invoice list order: newest first; the page is read straight off the index.
create index invoices_list_order_idx on public.invoices (invoice_date desc, number desc, id);

-- Receivables, overdue lists and outstanding figures only look at open (confirmed) invoices;
-- the covering columns let them run as index-only scans.
create index invoices_open_idx on public.invoices (due_date)
  include (amount_due, customer_id, subscription_id)
  where status = 'confirmed';

-- Default payment list order.
create index payments_list_order_idx on public.payments (payment_date desc, created_at desc, id);

-- Date-range sums (reports, revenue trend) read these as index-only scans.
drop index if exists public.invoices_invoice_date_idx;
create index invoices_date_cover_idx on public.invoices (invoice_date)
  include (status, due_date, total, amount_paid, amount_due, customer_id, subscription_id);
drop index if exists public.payments_date_idx;
create index payments_date_cover_idx on public.payments (payment_date)
  include (amount, customer_id, invoice_id);
