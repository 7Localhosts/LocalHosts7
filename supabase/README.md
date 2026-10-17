# Supabase Project Notes

The Node API in `../src/backend/server.js` connects to Supabase for the product catalogue, staff authentication, order/payment records, and product-image storage. The frontend does not contain a service-role key. The project must have the base `products`, `orders`, `order_items`, and `staff` tables expected by the API.

## Migration files in this repository

These are SQL files, not an application-startup migration runner:

1. `202610070001_checkout_sizes_payments.sql`
2. `202610120001_product_image_storage.sql`
3. `202610130001_verified_product_images.sql`
4. `202610140001_separate_payment_fulfillment_status.sql`
5. `202610140002_renamed_product_image_paths.sql`
6. `202610140003_add_visual_product_image_matches.sql`
7. `202610150001_optional_guest_checkout_and_product_visibility.sql`
8. `202610150002_availability_not_limited_by_legacy_stock.sql`
9. `202610160001_ensure_product_is_active.sql`

File names indicate ordering but do not prove that a particular Supabase project has applied them. Compare each file with that project's migration ledger and schema first. Review data-changing statements and image paths against the exact target project/assets, apply reviewed changes to staging before production, and record the real result. Do not rerun migrations solely because the application has a matching feature.

## Current known state and checks

The project owner previously reported manually adding `products.is_active BOOLEAN NOT NULL DEFAULT TRUE`. On 2026-10-17, the local read-only `/api/products` request returned 189 product rows, which confirms the running backend can read the catalogue. It does not verify the schema ledger, RLS policies, Storage policies, or migration state. This audit did not apply SQL or modify database records.

Earlier project notes flag `202610130001_verified_product_images.sql` for image-path reconciliation: do not apply it until every referenced object/path is verified. The admin upload route expects the configured public product bucket and admin authorization. Inspect `202610120001_product_image_storage.sql` and the target Storage policies before changing bucket or access settings.

## Credentials and safe testing

Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` only in the backend's local ignored `.env` or the hosting secret manager. Never paste values into documentation, browser JavaScript, GitHub, or logs. Use a separate staging Supabase project for write tests and synthetic catalogue/order records. Do not test uploads, checkout, order completion, or destructive RPCs against production.

The application does not create or reset a Supabase project and does not apply these migrations automatically. The project owner must confirm the intended environment and migration ledger before execution.
