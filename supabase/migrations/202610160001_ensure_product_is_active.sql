-- Ensure the product visibility flag exists in environments where it was
-- previously added manually. Existing publication choices are preserved.
begin;

alter table public.products
  add column if not exists is_active boolean default true;

update public.products
set is_active = true
where is_active is null;

alter table public.products
  alter column is_active set default true;

alter table public.products
  alter column is_active set not null;

commit;
