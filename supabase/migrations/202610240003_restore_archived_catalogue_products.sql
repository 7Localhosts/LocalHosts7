begin;

create or replace function public.keep_catalogue_tombstone()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.deleted_at is not null and current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
    new.deleted_at := old.deleted_at;
    new.is_active := false;
  end if;
  return new;
end;
$$;

create or replace function public.restore_catalogue_product(p_product_id text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;
  update public.products set deleted_at = null, is_active = true
    where id::text = p_product_id and deleted_at is not null;
  if not found then
    raise exception 'Archived product not found' using errcode = 'P0002';
  end if;
  return true;
end;
$$;

revoke all on function public.restore_catalogue_product(text) from public, anon, authenticated;
grant execute on function public.restore_catalogue_product(text) to service_role;

commit;
