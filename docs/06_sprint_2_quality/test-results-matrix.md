# Test Results Matrix — 2026-10-16

## Fresh local retest after the manual schema update

Environment: existing Node API on `http://localhost:8000`; existing static source preview on `http://localhost:5502`. The project owner reports manually adding `products.is_active BOOLEAN NOT NULL DEFAULT TRUE`. The API's successful 192-row response is the read-only evidence recorded here; no migration was applied and no database write, upload, order, staff sign-in, or payment was performed.

| Area / check | Result | Evidence / note |
|---|---|---|
| Backend `/api/health` | PASS | HTTP 200; `success: true`; “Backend is running.” |
| Backend `/api/products` | PASS | Read-only endpoint returned 192 products. |
| Supabase read connectivity | PASS | Backend's Supabase-backed product query returned 192 rows; no direct schema query was run during this retest. |
| Local landing, storefront, product, cart, checkout, and admin routes | PASS | HTTP 200 on the source preview; exact URLs are in `backend-smoke-output-2026-10-16-retest.txt`. |
| Storefront product rendering | PASS | Product cards rendered in the local browser after the API returned products. |
| Header Login, desktop | PASS | From the storefront reached through `/`, clicking Login opened the existing `/admin/` page and sign-in form. |
| Header Login, mobile | PASS | At 390 × 844, opening the mobile menu and clicking Login opened the same `/admin/` sign-in page. Viewport was reset afterward. |
| Existing automated suite (`npm test`) | PASS | Fresh command output: `automated-test-output-2026-10-16-retest.txt`. |
| JavaScript syntax checks | PASS | All 15 discovered JavaScript files across `src`, `deployment`, `tests`, and the generated image-review helper passed `node --check`; see `javascript-syntax-output-2026-10-16.txt`. |
| Supabase migration execution | NOT RUN | `products.is_active` was manually added. Migration `202610150001_optional_guest_checkout_and_product_visibility.sql` was inspected but not applied. |
| Admin credential authentication | NOT RUN | Login page and form loaded; no staff credentials were entered. |
| Inventory create/edit, image uploads, publish/hide/restore | NOT RUN | Requires authorized admin access and write operations in the intended test database/storage. |
| Cart changes and checkout submission | NOT RUN | Pages load locally; no order was written. |
| Order completion/history persistence | NOT RUN | Requires authenticated order mutation; no order data was changed. |
| Paystack Test Mode transaction | NOT RUN | No payment was initialized. No real payment was attempted. |
| Production static build | BLOCKED | Requires an approved public HTTPS `KAYS_HAVEN_API_URL`; none is documented in the workspace. |
| Approved GitHub submission destination | UNVERIFIED | Configured origin is public `7Localhosts/LocalHosts7`; no department approval evidence was found. No push was made. |

The original failure table below is retained as historical evidence from before the owner manually added the visibility column.

## Initial audit record (pre-manual schema update; preserved)

Environment: local Windows workspace; Node API already listening at `http://localhost:8000`; static source preview started at `http://localhost:5502`; configured Supabase checked read-only. No database writes, product uploads, staff login, or payment transactions were performed.

| Area / check | Result | Evidence / note |
|---|---|---|
| Existing automated backend/frontend suite (`npm test`) | PASS | `automated-test-output-2026-10-16.txt` |
| Backend `/api/health` | PASS | HTTP 200, `success: true`, “Backend is running” |
| Supabase connectivity | PASS | Read-only `products` query succeeded; 192 rows reported |
| Backend `/api/products` | FAIL | HTTP 500, `Failed to load products`; direct schema check returns PostgreSQL `42703`, `products.is_active` does not exist |
| Frontend/admin API configuration inspection | PASS | Shared `api-config.js` selects `http://localhost:8000` on localhost; admin loads the shared config script |
| Local source preview | PASS | Server started on port 5502; browser visual verification was blocked by the computer-use policy before navigation |
| Production static build | BLOCKED | Requires a real public HTTPS `KAYS_HAVEN_API_URL`; no production endpoint was supplied. Static preview assembly is covered by the passing frontend test. |
| Product browsing/details/sizes/cart against live data | BLOCKED | The required `/api/products` endpoint returns 500 |
| Checkout order write / Paystack initialize and verify | NOT RUN | Would create database/payment state; no separate staging confirmation or test payment session was used |
| Admin login / authorization | NOT RUN | No staff credentials entered or requested |
| Single/bulk upload and product publish/hide/restore | BLOCKED | Requires authenticated admin and `is_active` schema migration; no writes performed |
| Active orders/history persistence | NOT RUN | Requires authenticated admin and order mutation in a dedicated test environment |
| Mobile/responsive browser visual review | NOT RUN | No viewport/device capture completed |
| Broken images/horizontal overflow in browser | NOT RUN | No storefront product render was possible through the failing API and browser review was not completed |

## Synthetic test data policy

Unit tests use in-memory synthetic products/orders. Live checks were read-only. Use a dedicated staging Supabase project and Paystack Test Mode before running the manual test plan.
