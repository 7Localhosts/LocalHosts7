# Kay's Haven

Kay's Haven is a product catalogue and checkout website for mother-care, baby, children’s, and related products. The repository contains a static HTML/CSS/JavaScript frontend, a Node.js API, a Supabase-backed catalogue and orders, staff inventory tools, and server-side Paystack integration.

## Repository map

- `src/frontend/` — landing page, storefront, product detail, cart, checkout, styles, and verified local product-image mappings.
- `src/admin/` — staff login, inventory, and order-management interface.
- `src/backend/` — Node API, Supabase integration, payment initialization/verification, and its npm scripts.
- `supabase/migrations/` — reviewed SQL changes; these are not automatically run by the application.
- `tests/` — backend checks and frontend/source/build assertions.
- `deployment/` — local source server and static-site assembly scripts.
- `docs/` — project evidence, test records, release checklist, and technical audit notes.

## Run locally (PowerShell)

Use two terminals from the repository root:

```powershell
Set-Location src/backend
npm ci
npm start
```

In the second terminal:

```powershell
Set-Location src/backend
npm run dev:static
```

Open `http://localhost:5502/` for the landing page, `http://localhost:5502/shop.html` for the storefront, and `http://localhost:5502/admin/` for staff login. The API listens on `http://localhost:8000` by default. Local Supabase access requires a private `src/backend/.env` based on `.env.example`; never put service-role or Paystack secret keys in frontend code or commit them.

## Automated checks

From `src/backend`, run `npm test`. It executes the backend regression checks and frontend/source/build checks. See [`tests/README.md`](tests/README.md) for scope and limits. The tests do not perform authenticated Supabase writes or real payment transactions.

## Production build

The static build requires `KAYS_HAVEN_API_URL` to be the approved public HTTPS API base. See [`deployment/README.md`](deployment/README.md) for host and secret configuration. `npm run build:static` writes to and replaces the repository's `dist/` directory; preserve any existing build output before running it. Do not deploy until the staging checklist, migration review, payment Test Mode, and human approvals are complete.

The application does not apply Supabase migrations automatically. Review [`supabase/README.md`](supabase/README.md) and compare the SQL files with the target project's migration ledger before applying anything.
