# Bug Log — 2026-10-16

## KH-API-001 — Product API returned HTTP 500 before the manual schema update

- **Status:** Resolved for the current local check; retain the initial failure as historical evidence.
- **Severity:** High for local acceptance.
- **Reproduction:** With the backend running, request `GET http://localhost:8000/api/products`.
- **Observed:** HTTP 500 with `{ "error": "Failed to load products" }`.
- **Evidence:** API health returns HTTP 200. A read-only Supabase query of `products.id` succeeds and reports 192 rows. A read-only schema query for `products.is_active` returns PostgreSQL `42703`, `column products.is_active does not exist`.
- **Cause:** Current `src/backend/server.js` filters public inventory using `eq("is_active", true)`, but the connected Supabase schema does not have that column.
- **Resolution evidence:** The project owner reports manually adding `products.is_active BOOLEAN NOT NULL DEFAULT TRUE`. The fresh read-only check now returns 192 products from `/api/products`; see `backend-smoke-output-2026-10-16-retest.txt`.
- **Migration safety:** `202610150001_optional_guest_checkout_and_product_visibility.sql` was inspected but not applied. It also changes `orders.email` nullability and installs a service-role-only deletion RPC; verify the migration ledger and remaining schema changes before any future application.
- **Data safety:** No database rows were changed by this retest and no order/payment mutation was attempted.

## KH-BUILD-001 — Production static build requires public API URL

- **Status:** Environment setup required.
- **Reproduction:** Run `npm run build:static` from `src/backend` without `KAYS_HAVEN_API_URL`.
- **Expected current behavior:** Build refuses to proceed until a public HTTPS API base is configured. Do not substitute a dummy URL into a distributable production build.
- **Safe next step:** Configure the approved staging HTTPS backend URL in the build environment, then produce and inspect the production build.
