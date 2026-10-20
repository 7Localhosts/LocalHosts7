create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(trim(comment)) between 1 and 1000),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists reviews_product_id_created_at_idx
  on public.reviews (product_id, created_at desc);

alter table public.reviews enable row level security;

grant select, insert on public.reviews to anon, authenticated;

create policy reviews_public_read
  on public.reviews for select
  to anon, authenticated
  using (true);

create policy reviews_public_insert
  on public.reviews for insert
  to anon, authenticated
  with check (true);
