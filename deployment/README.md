# Kay's Haven deployment configuration

This repository does not deploy automatically. Build the landing page, storefront and admin together as one same-origin static site, and run `src/backend` as a Node.js service with HTTPS. Keep the Supabase service-role key and Paystack secret key in the backend host's secret manager only.

From `src/backend`, set `KAYS_HAVEN_API_URL` to the public HTTPS backend base URL and run `npm run build:static`. The build rejects missing, insecure, or localhost API URLs. Configure the static host to publish the repository's generated `dist` directory. The dedicated landing page is at `/`, the actual storefront at `/shop.html`, and the admin at `/admin/`; the build rewrites the API base in app pages. Both UIs then share the same browser origin for the backend CORS allowlist. Do not publish `src` directly; it contains backend code and local configuration files. For local UI work, pages use `http://localhost:8000` only when served from localhost and no API base is configured. The `buildStaticPreview()` helper assembles a temporary package for local checks only and does not inject a production API URL.

## Database setup

## Local source preview

Run `npm run dev:static` from `src/backend` to serve the current source files without rebuilding `dist`. Open `http://localhost:5502/` for the landing page, `http://localhost:5502/shop.html` for the storefront, and `http://localhost:5502/admin/` for staff login. The API remains a separate Node service on port `8000`; set `API_PORT` if it runs on another local port. Override `STATIC_PORT` if port `5502` is already in use.

Before enabling the current checkout, order-status, product-publication, safe-delete, and image-upload flows, have the project owner compare the live schema and Supabase migration ledger with the required migrations, then apply only outstanding changes to **staging first**. The project owner reports manually adding `products.is_active BOOLEAN NOT NULL DEFAULT TRUE`; the 2026-10-16 local `GET /api/products` check returned 192 products. Migration [`202610150001_optional_guest_checkout_and_product_visibility.sql`](../supabase/migrations/202610150001_optional_guest_checkout_and_product_visibility.sql) was inspected but not applied: besides an idempotent `is_active` column addition, it changes `orders.email` nullability and defines a service-role-only deletion RPC. Do not rerun it blindly; first verify the migration ledger and whether its remaining changes are still required.

The image-path migrations [`202610130001_verified_product_images.sql`](../supabase/migrations/202610130001_verified_product_images.sql), [`202610140002_renamed_product_image_paths.sql`](../supabase/migrations/202610140002_renamed_product_image_paths.sql), and [`202610140003_add_visual_product_image_matches.sql`](../supabase/migrations/202610140003_add_visual_product_image_matches.sql) update catalogue image fields. They are data-changing and must be reviewed against the exact image assets and their serving paths before applying; do not apply them blindly. None of these migrations was applied during this audit. Existing catalogue/order rows were not changed.

The `products`, `orders`, `order_items` and `staff` tables must already exist. Product/order IDs and item foreign keys must match; `products.stock`, `orders.status`, and the existing order fields used by the app must be present.

## Backend environment

Copy `src/backend/.env.example` to an untracked `.env` for local use, or configure the same variables in the production secret manager:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `KAYS_HAVEN_PRODUCT_BUCKET` (optional; defaults to `kays-haven-products`)
- `PAYSTACK_SECRET_KEY` (must be an `sk_test_...` key; this backend rejects live keys and remains in Test Mode)
- `PAYSTACK_CALLBACK_URL` (optional explicit public HTTPS callback URL for `/checkout/checkout.html`; if omitted, the backend derives it from `FRONTEND_ORIGIN`)
- `FRONTEND_ORIGIN` (the exact HTTPS origin serving the built storefront and `/admin/`, without a path)
- `PORT` (optional; defaults to `8000`)

The static build sets each page's API base from `KAYS_HAVEN_API_URL`; do not edit source pages for each deployment.

Checkout accepts a customer email when provided and stores no email value when omitted. Paystack still requires an email field for transaction initialization, so the backend uses a random, one-time alias on the HTTPS callback hostname when the customer leaves email blank. This alias does not represent or store a customer's personal email; the customer will not receive Paystack email receipts unless they provide their own address.

From `src/backend`, run `npm ci`, `npm test`, and `npm start`. The service must be reachable from the public storefront and configured for the storefront origin. Never put either Supabase service-role or Paystack secret keys in frontend files.

## Test Mode acceptance review

Before switching Paystack to live mode, complete a real Test Mode transaction against the public staging URL and verify:

1. A sized and a non-sized product can be added, and checkout uses database prices and stock; the total matches the product lines only.
2. Successful payment returns to the configured checkout URL, is verified by the backend, creates one order and its order items, and decrements stock exactly once.
3. A declined/cancelled payment does not clear the customer's cart or mark the order paid.
4. Both active staff accounts can log in and see the same order and inventory records.
5. The About, FAQ, Customer Feedback, Terms, Refund/Cancellation and Transport & Collection links load on the public storefront.

Production launch still requires resolving outstanding schema migrations, adding the account's Test Mode secret and final HTTPS URLs, completing the Test Mode acceptance review, and then configuring Paystack live credentials in the production secret manager. No deployment is performed by this repository workflow.
