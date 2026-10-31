-- Phase 5: discounts, their products, subscription attachments and usages.

create table public.discounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.discount_type not null,
  value numeric(12,2) not null check (value > 0),
  scope public.discount_scope not null,
  min_amount numeric(12,2) check (min_amount >= 0),
  min_quantity integer check (min_quantity >= 1),
  start_date date,
  end_date date,
  usage_limit integer check (usage_limit >= 1),
  usage_count integer not null default 0 check (usage_count >= 0),
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (usage_limit is null or usage_count <= usage_limit),
  check (type <> 'percent' or value <= 100),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index discounts_scope_idx on public.discounts (scope) where is_active;

create table public.discount_products (
  discount_id uuid not null references public.discounts (id) on delete cascade,
  product_id uuid not null references public.products (id),
  primary key (discount_id, product_id)
);
create index discount_products_product_idx on public.discount_products (product_id);

create table public.subscription_discounts (
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  discount_id uuid not null references public.discounts (id),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  primary key (subscription_id, discount_id)
);

create table public.discount_usages (
  id uuid primary key default gen_random_uuid(),
  discount_id uuid not null references public.discounts (id),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  subscription_id uuid not null references public.subscriptions (id),
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (discount_id, invoice_id)
);
create index discount_usages_invoice_idx on public.discount_usages (invoice_id);

create trigger set_updated_at before update on public.discounts
  for each row execute function public.set_updated_at();

alter table public.discounts enable row level security;
alter table public.discount_products enable row level security;
alter table public.subscription_discounts enable row level security;
alter table public.discount_usages enable row level security;
