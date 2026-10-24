-- Public product images are readable by storefront customers. Uploads go
-- through the authenticated backend using its service-role client.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kays-haven-products',
  'kays-haven-products',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
