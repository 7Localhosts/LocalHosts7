create or replace function public.finalize_paid_order(p_reference text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.orders%rowtype;
  line record;
  item_count bigint;
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

  select count(*) into item_count
  from public.order_items
  where order_id = current_order.id;

  if item_count = 0 then
    raise exception 'Order has no items';
  end if;

  for line in
    select product_id, sum(quantity)::integer as quantity
    from public.order_items
    where order_id = current_order.id
    group by product_id
    order by product_id
  loop
    if line.product_id is null or line.quantity is null or line.quantity < 1 then
      raise exception 'Order contains an invalid item';
    end if;

    update public.products
    set stock = stock - line.quantity
    where id = line.product_id
      and stock >= line.quantity;

    if not found then
      raise exception 'Insufficient stock for product %', line.product_id;
    end if;
  end loop;

  -- Keep payment state independent from order fulfillment state. Existing
  -- historical statuses are left as they are; only this payment field changes.
  update public.orders
  set payment_status = 'paid'
  where id = current_order.id;
end;
$$;

revoke all on function public.finalize_paid_order(text) from public, anon, authenticated;
grant execute on function public.finalize_paid_order(text) to service_role;
