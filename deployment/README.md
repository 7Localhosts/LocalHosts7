# Kay's Haven deployment configuration

This repository does not deploy automatically. Host `src/frontend` as a static website and run `src/backend` as a Node.js service with HTTPS. Keep the Supabase service-role key and Paystack secret key in the backend host's secret manager only.

## Database setup

Before starting the new checkout, apply [`202610070001_checkout_sizes_payments.sql`](../supabase/migrations/202610070001_checkout_sizes_payments.sql) to the Supabase project. It adds product sizes, payment/order metadata, order-item sizes and the atomic paid-order inventory function. Existing product/order records are retained.

The `products`, `orders`, `order_items` and `staff` tables must already exist. Product/order IDs and item foreign keys must match; `products.stock`, `orders.status`, and the existing order fields used by the app must be present.

## Backend environment

Copy `src/backend/.env.example` to an untracked `.env` for local use, or configure the same variables in the production secret manager:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `PAYSTACK_SECRET_KEY` (use an `sk_test_...` key for Test Mode; switch to the live key only after the test transaction and website review)
- `PAYSTACK_CALLBACK_URL` (the public HTTPS URL of `src/frontend/checkout/checkout.html`)
- `FRONTEND_ORIGIN` (the exact HTTPS origin serving the storefront/admin, without a path)
- `PORT` (optional; defaults to `8000`)
- `DELIVERY_FEE_GHS` (optional; defaults to `15`)

Set the `api-base` meta tag to the backend HTTPS base URL in `src/frontend/index.html`, `src/frontend/checkout/checkout.html`, `src/frontend/products/product.html`, and `src/admin/index.html`. The current checked-in value points at the local development backend.

From `src/backend`, run `npm ci`, `npm test`, and `npm start`. The service must be reachable from the public storefront and configured for the storefront origin. Never put either Supabase service-role or Paystack secret keys in frontend files.

## Test Mode acceptance review

Before switching Paystack to live mode, complete a real Test Mode transaction against the public staging URL and verify:

1. A sized and a non-sized product can be added, and checkout uses database prices, stock and delivery fee.
2. Successful payment returns to the configured checkout URL, is verified by the backend, creates one order and its order items, and decrements stock exactly once.
3. A declined/cancelled payment does not clear the customer's cart or mark the order paid.
4. Both active staff accounts can log in and see the same order and inventory records.
5. The About, FAQ, Customer Feedback, Terms, Refund/Cancellation and Delivery links load on the public storefront.

Production launch still requires applying the migration, adding the account's Test Mode secret and the final HTTPS URLs, completing the Test Mode acceptance review, and then configuring Paystack live credentials in the production secret manager. No deployment is performed by this repository workflow.
