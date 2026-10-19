begin;

-- Customers may check out with name and phone when they do not have or share
-- an email address. Empty emails are persisted as NULL by the backend.
alter table public.orders
  alter column email drop not null;

-- Keep catalogue rows and order history intact while allowing products to be
-- removed from and restored to the public storefront.
alter table public.products
  add column if not exists is_active boolean not null default true;

update public.products
set is_active = true
where is_active is null;

alter table public.products
  alter column is_active set default true,
  alter column is_active set not null;

create index if not exists products_is_active_id_idx
  on public.products (is_active, id);

-- Atomic guard against deleting any catalogue item that appears in order
-- history. This RPC is only callable by the backend service role.
create or replace function public.delete_product_without_orders(p_product_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  product_key public.products.id%type;
begin
  select id
    into product_key
    from public.products
   where id::text = p_product_id
   for update;

  if not found then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;

  if exists (
    select 1
      from public.order_items
     where product_id::text = product_key::text
  ) then
    raise exception 'Product is referenced by existing orders' using errcode = '23503';
  end if;

  delete from public.products where id::text = product_key::text;
  return true;
end;
$$;

revoke all on function public.delete_product_without_orders(text) from public, anon, authenticated;
grant execute on function public.delete_product_without_orders(text) to service_role;

commit;
