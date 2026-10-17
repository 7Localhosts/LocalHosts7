# Test Results Matrix — 2026-10-16

## First major integration test — 2026-10-16

The local API and storefront were inspected read-only. The browser showed 76 image-verified catalogue cards from 192 product rows; 116 products without a resolved image reference were not rendered. Product-detail pages for IDs 4 and 119 rendered their catalogue names, prices, and images; ID 119 showed None / N/A and Small, Medium, Large, and Extra Large options with quantity controls. The initial ID 4 browser snapshot occurred before asynchronous product/image validation completed and showed the HTML placeholder; a later refreshed view showed the correct product image. The follow-up moved local product/site assets to case-distinct folders and a refreshed browser confirmed the storefront, product detail, and admin login artwork. See [major integration test output](major-integration-test-output-2026-10-16.md) and the bug log.

| Area / check | Result | Evidence / note |
|---|---|---|
| Existing automated suite (npm test) | PASS | Fresh run recorded in major-integration-test-output-2026-10-16.md. |
| JavaScript syntax checks | PASS | Fresh node --check run across discovered project JavaScript files; see major integration output. |
| Git whitespace check (git diff --check) | PASS | Fresh check completed before checkpoint staging. |
| Backend /api/health | PASS | HTTP 200, success true. |
| Backend /api/products and Supabase read | PASS | Read-only query returned 192 rows; no raw product or customer data was written to the log. |
| Product catalogue image visibility | PASS with catalogue gaps | Browser product grid showed 76 image-verified cards. 116 rows had no resolved image reference and remained hidden; no product rows were deleted. |
| Product details and size controls | PASS for inspected products | ID 4 loaded an image and correct catalogue data with N/A size; ID 119 loaded an image and S/M/L/XL options plus quantity controls. The initial placeholder before async completion is logged as KH-DETAIL-001. |
| Cart and checkout page rendering | PASS | Empty-cart routes loaded. Checkout displayed required name/phone and optional email; no delivery field appeared. No cart line was created or checkout submitted. |
| Storefront Login navigation | PASS | Desktop/mobile click-through is recorded in browser-navigation-output-2026-10-16.txt; the current storefront link targets the existing admin page. |
| Admin sign-in page rendering | PASS | Existing form loaded in the browser; no credentials were entered. |
| Unauthenticated admin data access | PASS | GET /api/products?include_inactive=true and GET /api/orders each returned HTTP 401. |
| Admin authentication, inventory writes/uploads, publish/hide/restore | BLOCKED | No authenticated staging admin session was available; the configured Supabase project is not identified as staging. No writes were sent. |
| Synthetic order creation, completion, and history persistence | BLOCKED | Requires a designated staging database and authorized staff account; no database mutation was attempted. |
| Paystack Test Mode initialization/verification | BLOCKED | PAYSTACK_SECRET_KEY is unset in the local backend configuration. No payment or order was created. |
| Browser screenshots, JS console, and network panel capture | NOT RUN | Current browser UI returned accessible page state; screenshot and console/network export were not available in this run. |
| Production static build | BLOCKED | No approved public HTTPS KAYS_HAVEN_API_URL is configured. |
| D0–D10 document audit | PARTIAL | Folder-by-folder repository audit completed. The official course brief and WhatsApp-only copies were unavailable, so this is not an official rubric certification. See d0-d10-audit-2026-10-16.md. |

No database migration, product upload, order write, Paystack transaction, merge, or deployment was performed in this test.

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

## Repository and product-detail follow-up — 2026-10-17

| Area / check | Result | Evidence / note |
|---|---|---|
| Backend health | PASS | Read-only local `GET /api/health` returned `success: true`. |
| Supabase-backed product read | PASS | Read-only local `GET /api/products` returned 189 products. This does not confirm the remote migration ledger. |
| Automated backend/frontend suite | PASS | `npm test` from `src/backend`; output ended with `All backend checks passed` and `Frontend assets and checkout wiring passed`. No live data writes or payment transactions were part of this command. |
| Product-detail initial loading state | PASS — automated regression assertion | Source tests verify the page begins busy, shows the loading status, hides placeholder details, and reveals details after asynchronous product/image checks succeed. |
| Product image resolution | PARTIAL | A local read-only URL probe resolved 73 products to working images; 116 had no resolved image assignment and must remain unmatched until verified. |
| Browser visual/mobile/console review | NOT RUN | No new screenshot, real-browser viewport check, or console/network capture was produced in this follow-up. |
| GitHub branch freshness | BLOCKED | `git fetch origin` could not connect through the local proxy; branch comparison uses cached refs only. |
| Production build | BLOCKED | No `KAYS_HAVEN_API_URL` is configured; the build also replaces the existing `dist/` directory. |

The October 16 test entries above remain historical evidence and have not been rewritten. The broader repository audit and cached branch comparison are recorded in [`repository-audit-and-branch-plan-2026-10-17.md`](../repository-audit-and-branch-plan-2026-10-17.md).

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
