-- Phase 1: profiles, customers, settings, document numbering.
-- RLS is on for every table with no policies: only the server (table owner) reads them.

-- profiles.id equals auth.users.id. No FK so the schema also runs on plain Postgres (tests);
-- the server creates both sides and rolls back the auth user if the profile insert fails.
create table public.profiles (
  id uuid primary key,
  email text not null,
  full_name text,
  role public.user_role not null default 'customer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_email_key on public.profiles (lower(email));
create index profiles_role_idx on public.profiles (role);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  billing_address text,
  gstin text,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index customers_email_key on public.customers (lower(email));
create index customers_name_trgm on public.customers using gin (name extensions.gin_trgm_ops);

create table public.settings (
  key text primary key,
  value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.settings (key, value) values
  ('company', '{"name":"Brightloop","address":"Bengaluru, Karnataka, India","email":"billing@brightloop.test","phone":"","gstin":""}'),
  ('invoice.auto_confirm', 'true');

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.settings enable row level security;

-- Document numbers: SUB/2026/00001, INV/2026/00001. One global sequence per kind; the year
-- label comes from the document date (defaults to today in IST).
create sequence public.subscription_number_seq;
create sequence public.invoice_number_seq;

create or replace function public.next_doc_number(kind text, doc_date date default null)
returns text
language plpgsql
as $$
declare
  n bigint;
  d date := coalesce(doc_date, (now() at time zone 'Asia/Kolkata')::date);
begin
  if kind = 'SUB' then
    n := nextval('public.subscription_number_seq');
  elsif kind = 'INV' then
    n := nextval('public.invoice_number_seq');
  else
    raise exception 'Unknown document kind %', kind;
  end if;
  return kind || '/' || to_char(d, 'YYYY') || '/' || lpad(n::text, 5, '0');
end;
$$;
