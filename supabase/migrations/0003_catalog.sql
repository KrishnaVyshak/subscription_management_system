-- Phase 2: catalog (products, attributes, variants, taxes, payment terms, plans).

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.product_type not null default 'service',
  sales_price numeric(12,2) not null default 0 check (sales_price >= 0),
  cost_price numeric(12,2) not null default 0 check (cost_price >= 0),
  notes text,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_name_trgm on public.products using gin (name extensions.gin_trgm_ops);

create table public.product_attributes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index product_attributes_name_key on public.product_attributes (lower(name));

create table public.attribute_values (
  id uuid primary key default gen_random_uuid(),
  attribute_id uuid not null references public.product_attributes (id),
  value text not null,
  extra_price numeric(12,2) not null default 0 check (extra_price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attribute_id, value)
);

-- signature = sorted attribute_value ids joined by ',' so a combination exists once per product.
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id),
  name text not null,
  sku text unique,
  signature text not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, signature)
);

create table public.product_variant_values (
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  attribute_value_id uuid not null references public.attribute_values (id),
  primary key (variant_id, attribute_value_id)
);

-- Percent taxes store the percentage (18 = 18 %); fixed taxes store an amount per unit.
create table public.taxes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.tax_type not null default 'percent',
  rate numeric(12,4) not null check (rate >= 0),
  price_included boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (type <> 'percent' or rate <= 100)
);

create table public.product_taxes (
  product_id uuid not null references public.products (id) on delete cascade,
  tax_id uuid not null references public.taxes (id),
  primary key (product_id, tax_id)
);

create table public.payment_terms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  due_days integer not null default 0 check (due_days >= 0),
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  product_id uuid not null references public.products (id),
  price numeric(12,2) not null check (price >= 0),
  billing_period public.billing_period not null,
  interval_count integer not null default 1 check (interval_count >= 1),
  min_quantity integer not null default 1 check (min_quantity >= 1),
  available_from date,
  available_to date,
  auto_close boolean not null default false,
  closable boolean not null default true,
  pausable boolean not null default false,
  renewable boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (available_to is null or available_from is null or available_to >= available_from)
);
create index plans_product_idx on public.plans (product_id);

do $$
declare t text;
begin
  foreach t in array array['products', 'product_attributes', 'attribute_values', 'product_variants',
                           'taxes', 'payment_terms', 'plans']
  loop
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
  end loop;
  foreach t in array array['products', 'product_attributes', 'attribute_values', 'product_variants',
                           'product_variant_values', 'taxes', 'product_taxes', 'payment_terms', 'plans']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
