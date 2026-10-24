# Application Source

This folder contains the Kay's Haven application. The current implementation is plain HTML, CSS, and browser JavaScript backed by a Node.js HTTP API; it does not require a frontend framework or bundler.

## Components

| Path | Responsibility |
|---|---|
| `frontend/index.html`, `landing.css` | Full-screen landing page and shop navigation. |
| `frontend/shop.html`, `script.js`, `styles.css` | Catalogue fetch, category/filter UI, storefront cards, and cart entry points. |
| `frontend/products/` | Product-detail fetch, image validation, size/quantity controls, and add-to-cart behavior. |
| `frontend/cart/` | Cart display and edits. |
| `frontend/checkout/` | Customer form, item summary, payment initialization, and verification flow. |
| `frontend/product-images.js` | Verified local fallback assignments and shared image/size helpers. |
| `frontend/api-config.js` | Selects localhost API during local development or the configured base in a production build. |
| `frontend/brand-system.css` | Shared Kay's Haven wordmark styles. |
| `admin/` | Staff sign-in, inventory management, image uploads, product publication, and order history. |
| `backend/server.js` | Health, catalogue, staff, inventory, orders, and payment API routes. |
| `backend/order-utils.js` | Server-side price, size, availability, and order calculations. |

## Backend route inventory

The route handlers are implemented in `backend/server.js`:

| Method and path | Purpose |
|---|---|
| `GET /api/health` | Process health response. |
| `GET /api/products` | Public published catalogue; `include_inactive=true` is staff-only. |
| `POST /api/products/images` | Authenticated product-image upload. |
| `POST /api/products` | Authenticated product creation. |
| `PATCH /api/products/:id` | Authenticated product edit/publication update. |
| `DELETE /api/products/:id` | Authenticated safe-delete endpoint; backend rules protect order history. |
| `POST /api/staff/login`, `GET /api/staff/me` | Staff sign-in and session check. |
| `POST /api/staff`, `POST /api/staff/password` | Staff administration endpoints. |
| `GET /api/orders`, `PATCH /api/orders/:id/status` | Staff order list and status changes. |
| `POST /api/payments/initialize`, `POST /api/payments/verify` | Server-side payment initialization and verification. |

The legacy `POST /api/orders` route is intentionally disabled; the supported checkout starts with payment initialization and verifies the payment server-side.

## Local URLs

Start the API and source preview using the commands in the repository [README](../README.md). The source preview serves the landing page at `/`, the store at `/shop.html`, and the existing admin page at `/admin/`; the API defaults to port `8000`.

## Data and security boundaries

Supabase supplies product and order records. Staff-only mutations require backend authentication. Product images uploaded through inventory are stored in Supabase Storage; the frontend may also use explicitly verified local image assignments for existing products. Paystack initialization and verification are server-side. Do not add credentials, personal customer data, or deployment secrets here.

For migration prerequisites and the manual review rule, see [`../supabase/README.md`](../supabase/README.md). For test coverage and known limits, see [`../tests/README.md`](../tests/README.md).
