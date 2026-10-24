-- Run in the Supabase SQL editor before deploying the checkout.
-- Existing products, orders and order_items remain the system of record.
alter table public.products
  add column if not exists sizes text[] not null default '{}';

alter table public.orders
  add column if not exists phone text,
  add column if not exists order_number text,
  add column if not exists payment_reference text,
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists payment_method text;

alter table public.order_items
  add column if not exists size text;

update public.orders
set order_number = 'KH-' || upper(substr(replace(id::text, '-', ''), 1, 12))
where order_number is null or btrim(order_number) = '';

create unique index if not exists orders_order_number_unique
  on public.orders (order_number);

create or replace function public.assign_kayshaven_order_number()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.order_number is null or btrim(new.order_number) = '' then
    new.order_number := 'KH-' || upper(substr(replace(new.id::text, '-', ''), 1, 12));
  end if;
  return new;
end;
$$;

drop trigger if exists orders_assign_kayshaven_order_number on public.orders;
create trigger orders_assign_kayshaven_order_number
before insert on public.orders
for each row execute function public.assign_kayshaven_order_number();

create unique index if not exists orders_payment_reference_unique
  on public.orders (payment_reference)
  where payment_reference is not null;

-- Deduct inventory and mark the order paid in one database transaction.
create or replace function public.finalize_paid_order(p_reference text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.orders%rowtype;
  line record;
begin
  select * into current_order
  from public.orders
  where payment_reference = p_reference
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if current_order.payment_status = 'paid' then
    return;
  end if;

  for line in
    select product_id, quantity
    from public.order_items
    where order_id = current_order.id
  loop
    update public.products
    set stock = stock - line.quantity
    where id = line.product_id
      and stock >= line.quantity;

    if not found then
      raise exception 'Insufficient stock for product %', line.product_id;
    end if;
  end loop;

  update public.orders
  set payment_status = 'paid', status = 'Paid'
  where id = current_order.id;
end;
$$;

revoke all on function public.finalize_paid_order(text) from public, anon, authenticated;
grant execute on function public.finalize_paid_order(text) to service_role;
