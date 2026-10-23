-- Preserve the product image that was shown when each paid order was placed.
-- Existing order rows are deliberately left unchanged; older orders did not
-- capture an image snapshot and must not inherit a later catalogue image.
alter table public.order_items
  add column if not exists product_image_url text;
