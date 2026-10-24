-- Give the fresh order book a short, readable number beginning at KH-000001.
-- Apply after the old in-site order history has been cleared as requested.
create sequence if not exists public.kayshaven_order_number_seq
  as bigint
  start with 1
  increment by 1
  minvalue 1;

alter sequence public.kayshaven_order_number_seq restart with 1;

create or replace function public.assign_kayshaven_order_number()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.order_number is null or btrim(new.order_number) = '' then
    new.order_number := 'KH-' || lpad(nextval('public.kayshaven_order_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists orders_assign_kayshaven_order_number on public.orders;
create trigger orders_assign_kayshaven_order_number
before insert on public.orders
for each row execute function public.assign_kayshaven_order_number();
