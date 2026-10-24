begin;
alter table public.products add column if not exists deleted_at timestamptz;
create index if not exists products_available_catalogue_idx on public.products (id) where deleted_at is null;
-- Retain product rows and image assets: historical orders may reference both.
-- Lock the product so deletion and checkout stock updates serialize.
create or replace function public.archive_catalogue_product(p_product_id text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  perform id from public.products where id::text = p_product_id for update;
  if not found then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;
  update public.products set is_active = false, deleted_at = coalesce(deleted_at, now())
    where id::text = p_product_id;
  return true;
end;
$$;
revoke all on function public.archive_catalogue_product(text) from public, anon, authenticated;
grant execute on function public.archive_catalogue_product(text) to service_role;
-- A tombstone cannot be restored by stale admin requests or direct catalogue edits.
create or replace function public.keep_catalogue_tombstone()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.deleted_at is not null then
    new.deleted_at := old.deleted_at;
    new.is_active := false;
  end if;
  return new;
end;
$$;
drop trigger if exists keep_catalogue_tombstone on public.products;
create trigger keep_catalogue_tombstone before update on public.products
for each row execute function public.keep_catalogue_tombstone();
commit;
