# Manual End-to-End Test Plan

Run only against a dedicated staging Supabase project with synthetic accounts/products and Paystack Test Mode. Do not use real customer records or live payment keys. Record a timestamp, environment, tester, steps, expected result, actual result, and screenshot for each row.

## Local browser entry points

The source preview is currently responding on `http://localhost:5502/`; the Node API is responding on `http://localhost:8000/`. Open these pages during manual testing:

- Landing: `http://localhost:5502/`
- Storefront: `http://localhost:5502/shop.html`
- Product detail: open a product card from the storefront; links use `/products/product.html?id=<product-id>`.
- Cart: `http://localhost:5502/cart/cart.html`
- Checkout: `http://localhost:5502/checkout/checkout.html`
- Admin sign-in and dashboard: `http://localhost:5502/admin/`
- API health: `http://localhost:8000/api/health`
- API products: `http://localhost:8000/api/products`

Both local servers are already responding in this workspace. If a server is stopped, start the API from `src/backend` with `npm start`, and start the static source preview in a separate terminal from `src/backend` with `npm run dev:static`. Check the target port first to avoid duplicate processes. Use authorized staff credentials only; no credentials are stored in this plan.

| ID | Scenario | Steps and expected result | Required evidence |
|---|---|---|---|
| M-01 | Landing/storefront | Load `/`, click Shop Now, browse categories and search. No console errors; only products with valid images are shown. | Desktop and mobile screenshots; browser console/network capture |
| M-02 | Product details | Open a published product, select a size if supported, adjust quantity, add to cart. Correct image, price, size and quantity persist. | Product detail and cart screenshot |
| M-03 | Cart | Change quantities/remove an item; refresh. Totals update and cart behavior matches product rules. | Cart screenshot and console/network capture |
| M-04 | Checkout validation | Synthetic name + phone, omit email, then provide malformed and valid optional email. Verify validation without placing an order first. | Form screenshots; no order submitted until explicit test run |
| M-05 | Paystack Test Mode | With project-owner approval, initialize one test payment and verify success plus canceled/declined paths. No live charges. | Redacted request/result and Paystack Test Mode transaction reference |
| M-06 | Admin login/access | Log in with a designated staging admin; request staff-only endpoints without a token and with a non-admin token. Unauthorized calls must fail. | Redacted network status codes; no credentials |
| M-07 | Single inventory upload | Upload a synthetic JPG/PNG/WebP; verify storage URL, product row, and storefront display after refresh. | Storage object metadata and product screenshot |
| M-08 | Bulk upload | Upload two or more uniquely named synthetic images; remove one pending row, save remaining records, verify name-image pairing. | Before/after screenshots and synthetic product IDs |
| M-09 | Availability/edit/restore | Edit a synthetic product, hide it, confirm direct link/cart cannot buy it, restore it, refresh storefront. | Product IDs and screenshots from each state |
| M-10 | Orders/history | Place a synthetic test-mode order, inspect independent items/payment totals, complete/cancel one order, refresh; history must persist. | Redacted order IDs/status before/after |
| M-11 | Mobile layout | Repeat M-01 through M-03 at a mobile viewport; no clipped controls or horizontal overflow. | Mobile screenshots |
| M-12 | Failure handling | In staging, test invalid image type/size, temporary storage failure and database error. No broken product is published; error is clear. | Redacted error output |

Current gate: the product endpoint and Login navigation are now verified locally. M-02 through M-10 still need interactive/manual execution with authorized staff access and synthetic data in the intended staging project; no database writes or payments were performed in the retest. See the [current matrix](test-results-matrix.md) and [bug log](bug-log.md).
