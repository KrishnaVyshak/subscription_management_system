-- Phase 6: payments and the invoice_overview view (overdue flags in IST).

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id),
  customer_id uuid not null references public.customers (id),
  method public.payment_method not null,
  amount numeric(12,2) not null check (amount > 0),
  payment_date date not null,
  note text,
  recorded_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_invoice_idx on public.payments (invoice_id);
create index payments_date_idx on public.payments (payment_date);
create index payments_customer_idx on public.payments (customer_id);

create trigger set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
alter table public.payments enable row level security;

-- Overdue = confirmed, past its due date (today in Asia/Kolkata) and something still due.
create view public.invoice_overview with (security_invoker = true) as
select i.*,
       c.name as customer_name,
       (i.status = 'confirmed'
         and i.due_date < (now() at time zone 'Asia/Kolkata')::date
         and i.amount_due > 0) as is_overdue,
       case when i.status = 'confirmed'
                 and i.due_date < (now() at time zone 'Asia/Kolkata')::date
                 and i.amount_due > 0
            then (now() at time zone 'Asia/Kolkata')::date - i.due_date
            else 0 end as days_overdue
  from public.invoices i
  join public.customers c on c.id = i.customer_id;
