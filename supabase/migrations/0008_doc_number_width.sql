-- lpad() truncates longer strings, so number 100000 became "10000" (a duplicate).
-- Pad to at least 5 digits and let larger numbers grow.
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
  return kind || '/' || to_char(d, 'YYYY') || '/' || to_char(n, 'FM999999999999900000');
end;
$$;
