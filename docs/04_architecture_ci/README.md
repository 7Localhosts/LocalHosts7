# D4 — Architecture and CI

## Current architecture

```text
Browser: landing/storefront/product/cart/checkout/admin
    └── api-config.js (localhost:8000 locally; configured same-origin or API base in build)
          └── Node.js HTTP API (src/backend/server.js)
                ├── Supabase Auth / Postgres (products, orders, order_items, staff)
                ├── Supabase Storage (public product reads; authenticated admin uploads)
                └── Paystack API (server-side initialize and verify)
```

Frontend and admin configuration are in `src/frontend/api-config.js`; the admin page loads that shared script. `deployment/build-static.js` requires a public HTTPS API URL for a production build. Deployment instructions are in [`deployment/README.md`](../../deployment/README.md).

## CI evidence

`.github/workflows/ci.yml` runs repository structure checks, `npm ci`, `npm test`, and JavaScript syntax checks. The local automated test output and current acceptance matrix are in [D6](../06_sprint_2_quality/test-results-matrix.md).

## Current local integration status

The Node process responds on port 8000 and the read-only `GET /api/products` request now returns 192 records. The project owner reports manually adding `products.is_active BOOLEAN NOT NULL DEFAULT TRUE`; this retest did not run a direct schema query or apply a migration. The previously failing response is retained in the D6 historical log.

Before applying `supabase/migrations/202610150001_optional_guest_checkout_and_product_visibility.sql`, verify the Supabase migration ledger and inspect its other changes: optional `orders.email` and a service-role-only deletion RPC. This audit did not apply it. Local static and API routes are ready for manual testing; staff-authenticated writes and Paystack Test Mode remain unrun.
