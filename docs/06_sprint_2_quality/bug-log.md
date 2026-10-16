# Bug Log — 2026-10-16

## KH-DETAIL-001 — Product details briefly exposes template placeholder while loading

- Status: Open; low severity.
- Reproduction: Open http://localhost:5502/products/product.html?id=4 and inspect immediately, before the products API response and local image-load check complete.
- Observed: The first browser accessibility snapshot showed the static Product Name / GHS 0.00 placeholder. After the asynchronous fetch/image check completed, the title, Seba Med Cleansing Bar image, category, and GHS 85.00 price appeared correctly.
- Expected: Show an explicit loading state or hide the product form until validated catalogue data is ready.
- Evidence/limits: A later browser snapshot confirmed correct data and image. No saved screenshot or browser console/network log was available. The API and page eventually succeeded; this was not a persistent product-load failure.
- Suggested fix: Add a loading indicator that is replaced by product data or a clear unavailable state; do not display template product details as live data.

## KH-IMG-MIGRATION-001 — One staged image-path migration references absent files

- Status: Do not apply until corrected.
- Reproduction: Compare the image filenames in src/frontend/images against paths in supabase/migrations/202610130001_verified_product_images.sql.
- Observed: 41 referenced e-commerce PNG files are absent from the current folder. Later normalized path migrations use the ID-named files present in the current frontend image map.
- Impact: Applying this migration can leave image paths referring to absent local assets for products it updates. No migration was run.
- Suggested fix: Reconcile or retire the stale migration with the project owner, then validate all paths before any database application.

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

## KH-PATH-CASE-001 — Product and site asset paths collided with legacy Images folder casing

- **Status:** Resolved in the October 16 integration checkpoint.
- **Cause:** The repository already tracks a capitalized `src/frontend/Images` directory on a case-insensitive Windows workspace. The new local code/assets had been committed under lowercase `src/frontend/images`, creating case-only folder paths that can be ambiguous on Windows checkouts.
- **Fix:** Product photographs now use the distinct `src/frontend/product-images` directory; the landing background and emblem use `src/frontend/site-assets`. Frontend, admin, and static-build references were updated. The original local image files were copied into these directories and were not deleted from the working tree.
- **Verification:** The automated frontend suite's static-preview checks passed after updating its former path assertions. A browser refresh showed the product grid photos, product ID 4 detail image, and admin login page/background loading from the new locations.
