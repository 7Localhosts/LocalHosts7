# Major Integration Test Output — 2026-10-16

These are actual local checks from the October 16 checkpoint. No database writes, admin uploads, orders, or payment transactions were performed. Environment values and product/customer records are intentionally omitted.

## Backend smoke check

- Backend base: `http://localhost:8000`
- `GET /api/health`: HTTP 200; `success=true`; message `Backend is running`.
- `GET /api/products`: HTTP 200; response envelope contains 192 product rows.
- Supabase connectivity: PASS for the read-only product query through the backend.
- No credentials or record payloads were written to this evidence file.

## Automated checks

Command: `npm --prefix src/backend test`

Result: exit code 0.

```text
Check email validation
Check server prices, sizes, and product visibility
Check selectable fulfillment transitions
Check required sizes with stale inventory counts
Check backend health endpoint
All backend checks passed
Frontend assets and checkout wiring passed
```

Command: `node --check` for each JavaScript file discovered under `src`, `deployment`, and `tests`, excluding `node_modules`.

Result: 14 files checked; all syntax checks passed.

Command: `git diff --check`.

Result: exit code 0. Git emitted only line-ending conversion warnings for modified text files; it reported no whitespace errors.

## Browser and local route checks

Browser session: existing local static preview at `http://localhost:5502`.

- Landing page and Enter Shop navigation rendered.
- Storefront rendered 76 image-validated product cards from the live 192-row API response. The current catalogue has 116 rows without a resolved image reference; those products are not shown on the customer storefront.
- Product ID 4 loaded the catalogue name Seba Med Cleansing Bar, its image, and GHS 85.00 after API/image validation completed. The first immediate browser snapshot showed a template placeholder before loading completed; see bug `KH-DETAIL-001`.
- Product ID 119 loaded its image, name, price, N/A plus S/M/L/XL size options, quantity controls, and add-to-cart control.
- Cart and checkout pages loaded in the empty-cart state. Checkout showed name and phone required, email optional, and no delivery field. No checkout was submitted.
- Storefront Login was clicked on desktop and mobile in the browser; both reached the existing admin sign-in at `http://localhost:5502/admin/`. Prior click-through evidence is in `browser-navigation-output-2026-10-16.txt`.
- Admin sign-in form rendered. No credentials were entered.
- Unauthenticated `GET /api/products?include_inactive=true` and `GET /api/orders` returned HTTP 401.

No screenshot file, browser console export, or network-panel export was produced in this run. Browser visual results above come from the actual page state and click-through, not an HTTP-only check.

## Checks not performed

| Check | Result | Reason |
|---|---|---|
| Admin sign-in | NOT RUN | No authorized staff test credentials were entered. |
| Single/bulk product upload and image-storage write | BLOCKED | Requires authenticated admin access and confirmation that the connected Supabase project is a designated test environment. |
| Product publish/hide/restore write | BLOCKED | Would mutate catalogue data; no staging write approval was available. |
| Synthetic order creation, completion, and history persistence | BLOCKED | Requires a designated test database and authorized admin session. |
| Paystack Test Mode | BLOCKED | Backend Paystack secret is not configured in the local environment; no payment was initialized. |
| Production static build | BLOCKED | `npm --prefix src/backend run build:static` was run and exited 1 because `KAYS_HAVEN_API_URL` is unset. The builder validates the URL before its output cleanup, so it stopped before producing a build. |
| Responsive overflow, browser console, and network error capture | NOT RUN | No exported screenshot or console/network trace was available for this check. |

## Defects and limits

- `KH-DETAIL-001`: Product detail briefly displays template placeholder text before catalogue data resolves, then loads correctly.
- `KH-IMG-MIGRATION-001`: One historical SQL migration references 41 PNG files absent from the current image directory. It was not applied; validate/retire it before any future execution.
- 116 of 192 catalogue rows still lack a resolved image reference and are consequently not visible in the storefront. This count is based on the API/catalogue and browser rendering checks; no product records were changed.
