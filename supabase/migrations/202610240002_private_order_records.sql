begin;
-- Customer reads go through signed receipt endpoints; staff reads require backend authentication.
-- Every existing order write/read in server.js uses the service role.
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
revoke all on table public.orders, public.order_items from anon, authenticated;
grant select, insert, update, delete on table public.orders, public.order_items to service_role;
commit;
