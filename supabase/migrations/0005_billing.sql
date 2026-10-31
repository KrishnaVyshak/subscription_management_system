-- Phase 4: invoices, invoice lines and tax snapshots, billing runs.

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  subscription_id uuid not null references public.subscriptions (id),
  customer_id uuid not null references public.customers (id),
  status public.invoice_status not null default 'draft',
  period_start date not null,
  period_end date not null,
  invoice_date date not null,
  due_date date not null,
  subtotal numeric(12,2) not null default 0,
  discount_total numeric(12,2) not null default 0,
  tax_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0 check (total >= 0),
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  amount_due numeric(12,2) generated always as (total - amount_paid) stored,
  customer_snapshot jsonb not null,
  company_snapshot jsonb not null default '{}',
  billing_run_id uuid,
  confirmed_at timestamptz,
  sent_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (amount_paid <= total),
  check (period_end >= period_start),
  check (due_date >= invoice_date)
);
-- Never bill the same period twice (cancelled invoices free the period).
create unique index invoices_one_per_period on public.invoices (subscription_id, period_start)
  where status <> 'cancelled';
create index invoices_status_due_idx on public.invoices (status, due_date);
create index invoices_customer_idx on public.invoices (customer_id);
create index invoices_invoice_date_idx on public.invoices (invoice_date);
create index invoices_subscription_idx on public.invoices (subscription_id, period_start desc);

create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  subscription_line_id uuid references public.subscription_lines (id) on delete set null,
  product_id uuid references public.products (id),
  description text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  line_subtotal numeric(12,2) not null,
  discount_amount numeric(12,2) not null default 0,
  taxable_amount numeric(12,2) not null,
  tax_amount numeric(12,2) not null default 0,
  amount numeric(12,2) not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index invoice_lines_invoice_idx on public.invoice_lines (invoice_id);

create table public.invoice_line_taxes (
  id uuid primary key default gen_random_uuid(),
  invoice_line_id uuid not null references public.invoice_lines (id) on delete cascade,
  tax_id uuid references public.taxes (id) on delete set null,
  tax_name text not null,
  type public.tax_type not null,
  rate numeric(12,4) not null,
  price_included boolean not null,
  amount numeric(12,2) not null
);
create index invoice_line_taxes_line_idx on public.invoice_line_taxes (invoice_line_id);

create table public.billing_runs (
  id uuid primary key default gen_random_uuid(),
  as_of_date date not null,
  triggered_by uuid references public.profiles (id),
  source text not null default 'manual',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  due integer not null default 0,
  generated integer not null default 0,
  skipped integer not null default 0,
  failed integer not null default 0,
  errors jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- At most one running billing run at a time.
create unique index billing_runs_one_running on public.billing_runs ((true)) where status = 'running';
create index billing_runs_started_idx on public.billing_runs (started_at desc);

alter table public.invoices
  add constraint invoices_billing_run_fk foreign key (billing_run_id) references public.billing_runs (id);

create trigger set_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.billing_runs
  for each row execute function public.set_updated_at();

alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.invoice_line_taxes enable row level security;
alter table public.billing_runs enable row level security;
