# D2 — Requirements and Acceptance Evidence

This folder records requirements visible in the current application and the original GitHub issue tracker. It is not a signed client specification.

| Area | Current evidence | Audit state |
|---|---|---|
| Landing page and navigation | `src/frontend/index.html`, `shop.html`, `script.js` | Source present; visual acceptance pending |
| Product catalogue | `src/frontend/script.js`, `/api/products` | Local read-only endpoint returned 192 rows on 2026-10-16 after the owner manually added `products.is_active`; no product writes were tested |
| Product details, sizes, cart | `src/frontend/products/`, `src/frontend/cart/` | Automated source/unit checks pass; interactive end-to-end test pending |
| Checkout and order totals | `src/frontend/checkout/`, `src/backend/order-utils.js` | Automated checks pass; database/payment flow blocked pending schema and staging credentials |
| Admin and inventory | `src/admin/`, authenticated backend routes | Code/tests present; real admin session and storage upload not tested |
| Orders and history | `src/admin/app.js`, `/api/orders` routes | Automated checks cover rendering/wiring; live persistence not tested |
| Responsive experience | CSS media queries in frontend/admin stylesheets | Code review only; device/browser visual review pending |

Original work items: [#1 Homepage & Navigation](https://github.com/7Localhosts/LocalHosts7/issues/1), [#2 Products & Categories](https://github.com/7Localhosts/LocalHosts7/issues/2), [#3 Product Details & Cart](https://github.com/7Localhosts/LocalHosts7/issues/3), [#4 Checkout & Customer Orders](https://github.com/7Localhosts/LocalHosts7/issues/4), [#5 Backend & Database](https://github.com/7Localhosts/LocalHosts7/issues/5), [#6 Payments, Contacts and Reviews](https://github.com/7Localhosts/LocalHosts7/issues/6), and [#8 Admin dashboard (titled “Isuue#7” in GitHub)](https://github.com/7Localhosts/LocalHosts7/issues/8).

See the [test matrix](../06_sprint_2_quality/test-results-matrix.md) for executed evidence and open blockers.
