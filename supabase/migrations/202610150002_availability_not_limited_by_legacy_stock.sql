-- Product stock is an admin inventory metric only. Legacy zero stock values
-- must not prevent purchases or mark a Paystack-paid order as unverified.
create or replace function public.finalize_paid_order(p_reference text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.orders%rowtype;
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

  -- Do not decrement stock here. Storefront availability is controlled by
  -- products.is_active and a valid public image; stock values may be stale.
  update public.orders
  set payment_status = 'paid'
  where id = current_order.id;
end;
$$;

revoke all on function public.finalize_paid_order(text) from public, anon, authenticated;
grant execute on function public.finalize_paid_order(text) to service_role;
