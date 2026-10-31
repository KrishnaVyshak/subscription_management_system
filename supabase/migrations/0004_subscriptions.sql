-- Phase 3: quotation templates, subscriptions, lines, status log.

create table public.quotation_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan_id uuid not null references public.plans (id),
  payment_term_id uuid references public.payment_terms (id),
  validity_days integer not null default 30 check (validity_days >= 0),
  notes text,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.template_lines (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.quotation_templates (id) on delete cascade,
  product_id uuid not null references public.products (id),
  variant_id uuid references public.product_variants (id),
  description text,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12,2) check (unit_price >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index template_lines_template_idx on public.template_lines (template_id);

-- billing_period / interval_count are copied from the plan so plan edits never change billing.
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  customer_id uuid not null references public.customers (id),
  plan_id uuid not null references public.plans (id),
  template_id uuid references public.quotation_templates (id),
  status public.subscription_status not null default 'draft',
  billing_period public.billing_period not null,
  interval_count integer not null default 1 check (interval_count >= 1),
  start_date date not null,
  expiry_date date,
  term_days integer,
  quote_valid_until date,
  billing_anchor_date date,
  next_invoice_date date,
  periods_billed integer not null default 0 check (periods_billed >= 0),
  payment_term_id uuid references public.payment_terms (id),
  salesperson_id uuid references public.profiles (id),
  notes text,
  paused_at date,
  closed_at date,
  close_reason text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expiry_date is null or expiry_date >= start_date)
);
create index subscriptions_status_idx on public.subscriptions (status);
create index subscriptions_customer_idx on public.subscriptions (customer_id);
create index subscriptions_plan_idx on public.subscriptions (plan_id);
create index subscriptions_created_idx on public.subscriptions (created_at desc);
create index subscriptions_due_idx on public.subscriptions (next_invoice_date) where status = 'active';

-- A line is in effect on day d when starts_on <= d (or null) and ends_on >= d (or null).
create table public.subscription_lines (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  product_id uuid not null references public.products (id),
  variant_id uuid references public.product_variants (id),
  description text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  is_plan_line boolean not null default false,
  starts_on date,
  ends_on date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on - 1)
);
create index subscription_lines_sub_idx on public.subscription_lines (subscription_id);

create table public.subscription_line_taxes (
  line_id uuid not null references public.subscription_lines (id) on delete cascade,
  tax_id uuid not null references public.taxes (id),
  primary key (line_id, tax_id)
);

create table public.subscription_status_log (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  from_status public.subscription_status,
  to_status public.subscription_status not null,
  changed_by uuid references public.profiles (id),
  note text,
  created_at timestamptz not null default now()
);
create index subscription_status_log_sub_idx on public.subscription_status_log (subscription_id, created_at);

do $$
declare t text;
begin
  foreach t in array array['quotation_templates', 'template_lines', 'subscriptions', 'subscription_lines']
  loop
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
  end loop;
  foreach t in array array['quotation_templates', 'template_lines', 'subscriptions', 'subscription_lines',
                           'subscription_line_taxes', 'subscription_status_log']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
