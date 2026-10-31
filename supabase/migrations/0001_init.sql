-- Phase 0: extensions, shared enums and helper functions.
-- Enum values must match shared/src/constants.js.

create extension if not exists pg_trgm with schema extensions;

create type public.user_role as enum ('admin', 'staff', 'customer');
create type public.product_type as enum ('service', 'goods', 'addon');
create type public.billing_period as enum ('daily', 'weekly', 'monthly', 'yearly');
create type public.subscription_status as enum (
  'draft', 'quotation', 'confirmed', 'active', 'paused', 'closed'
);
create type public.invoice_status as enum ('draft', 'confirmed', 'paid', 'cancelled');
create type public.discount_type as enum ('percent', 'fixed');
create type public.discount_scope as enum ('product', 'subscription');
create type public.tax_type as enum ('percent', 'fixed');
create type public.payment_method as enum (
  'cash', 'bank_transfer', 'upi', 'card', 'cheque', 'other'
);

-- Attach to every table with:
--   create trigger set_updated_at before update on <table>
--   for each row execute function public.set_updated_at();
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
