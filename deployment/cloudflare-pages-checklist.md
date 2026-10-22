# Kay's Haven: temporary Cloudflare Pages Direct Upload checklist

Prepared against GitHub `main` commit `ccde4bfbc3c3cf12e4d0ae4fa9fa92a6604a3fff` on 2026-10-22. GitHub branch creation is unavailable through the connected integration, so use a dedicated Pages **Direct Upload** project for this temporary deployment. Direct Upload projects cannot later switch to Git integration; use a separate Git-integrated project for long-term automatic deployments. Deploy the tested backend fix to Render from a reviewed commit before calling it deployed. The temporary Pages URL is for validation only; do not add the custom domain or change Name.com DNS or nameservers during this phase. Keep the existing Render and Supabase services; make no production database or Paystack mode changes.

## Cloudflare Pages project settings

Create a dedicated **Direct Upload** project for this temporary deployment. Upload the prebuilt `dist` folder; the project name determines its assigned `<project>.pages.dev` URL. It needs no Name.com zone or custom-domain DNS. Cloudflare documents that a Direct Upload project cannot later switch to Git integration, so keep it as the test project and create a separate Git-integrated project for ongoing deployments if needed.

| Setting | Value |
|---|---|
| Upload method | Dashboard Direct Upload of the prebuilt `dist` folder |
| Local build command | `cd src/backend && npm ci && npm run build:static` |
| Node.js version | `22` (`.node-version` is included) |
| Build API variable | `KAYS_HAVEN_API_URL=https://kays-haven-backend.onrender.com` |
| Build frontend-origin variable | `KAYS_HAVEN_FRONTEND_ORIGIN=https://<project>.pages.dev` |
| Temporary project | A dedicated project name; do not attach `kayshaven.live` |

The build script copies only `src/frontend` and `src/admin` into `dist`, then injects the public HTTPS API URL into the HTML pages. The verified output contained 207 files (134.4 MiB total); its largest file was 2.83 MiB, under Pages' 25 MiB per-file limit and 20,000-file Free plan limit. Do not put Supabase keys, Paystack keys, or any backend secret in Pages variables. The local production build completed with this API URL and the output scan found no credential patterns.

The build injects the exact HTTPS frontend origin into the generated `_headers` file and rejects wildcard, path, credential, and non-HTTPS origins. Use the assigned Pages hostname during testing, then change the setting to `https://kayshaven.live` only during an approved custom-domain launch. Cloudflare Pages applies `_headers` rules to static responses; verify the deployed response contains the exact origin. This static header does not replace the backend's separate CORS check.

After Pages assigns the project hostname, set Render's `FRONTEND_ORIGIN` to that single exact value, for example `https://<project>.pages.dev`. The deployed backend's CORS middleware must be the tested code from `main` before setting this value. It rejects any other requesting origin; do not allow `*.pages.dev` or arbitrary origins. When the custom domain is later approved, change both frontend-origin values to the apex URL.

The generated `dist` includes `/admin/` and `/checkout/checkout.html`. Cloudflare Pages serves the `admin/index.html` directory route and static files directly; no SPA fallback is needed.

## Temporary deployment and verification order

1. Incorporate the tested backend CORS change into the Render-linked commit and wait for the backend deployment to finish. Do not claim the CORS fix is deployed before confirming the running backend rejects an unapproved `Origin` and accepts only the configured exact origin.
2. In Cloudflare, create a dedicated Direct Upload Pages project. Do not connect `kayshaven.live` or alter DNS.
3. With the actual project hostname assigned, rebuild locally with `KAYS_HAVEN_FRONTEND_ORIGIN=https://<project>.pages.dev` and `KAYS_HAVEN_API_URL=https://kays-haven-backend.onrender.com`, then upload the resulting `dist` folder.
4. Set Render's `FRONTEND_ORIGIN` to the exact assigned Pages origin after the CORS fix is deployed; redeploy and verify it accepts only that origin.
5. Verify the temporary URL serves `/`, `/shop.html`, `/cart/cart.html`, `/checkout/checkout.html`, and `/admin/`. Check `_headers` and the browser network panel for the exact origin.
6. From the Pages origin, check the public products and health API calls. Confirm a preflight from the exact Pages origin succeeds and the same request from an unapproved origin is rejected. Do not place orders against production data.
7. Confirm Paystack is still using Test Mode before any payment flow. Use only test credentials in Render, never in Pages or source control. Do not run a real charge.
8. After temporary deployment and tests pass, inspect account ownership for `kayshaven.live` in the user's own Name.com account. Do not add the domain to Pages or change DNS/nameservers in this phase.

## Name.com hosting and DNS inventory

1. Sign in to the user's own Name.com account and confirm domain ownership there. Check whether the account includes web hosting and record its features, renewal status, and whether it can serve the static `dist` output with HTTPS and a `www` redirect. Name.com hosting would only replace the static frontend host if it meets those needs; Render remains the Node API and Supabase remains the database/storage service.
2. Export or capture the **complete** Name.com DNS zone before migration. Preserve all MX, SPF, DKIM, DMARC, verification, and unrelated service records. The public DNS snapshot previously observed had Name.com nameservers `ns3fqs.name.com`, `ns1bqx.name.com`, `ns4fqz.name.com`, and `ns2jrt.name.com`; apex A records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`; and `www` CNAME `7localhost.github.io`. Confirm these values in the account before relying on them.
3. Sign in to the user's own Cloudflare account, authorize its GitHub integration for this repository, and create the Pages project. Check the first build and `*.pages.dev` static routes before touching DNS.
4. Add `kayshaven.live` and `www.kayshaven.live` under the Pages project's **Custom domains**. Use the Pages UI's generated DNS targets; the expected target is the project's assigned `<project>.pages.dev` hostname.

## DNS cutover: approval gate

Cloudflare Pages requires the apex domain to use a Cloudflare zone and Cloudflare nameservers. The registrar can remain Name.com, so this changes DNS hosting only; it does not transfer domain ownership. **Do not change nameservers until the user has reviewed the imported DNS zone and explicitly approved the cutover.**

After approval, use the exact Cloudflare nameservers displayed for this zone in Name.com. Do not copy example nameservers. In Cloudflare DNS, the expected web records are:

| Type | Name | Target | Proxy / notes |
|---|---|---|---|
| CNAME | `@` | `<project>.pages.dev` | Proxied; Cloudflare flattens the apex CNAME. Pages may create this automatically when the custom domain is activated. |
| CNAME | `www` | `<project>.pages.dev` | Proxied; add `www.kayshaven.live` as a Pages custom domain as well. |

Remove the old GitHub Pages apex A records and the old `www` CNAME only after the full zone has been copied and checked, and only if they are still present and conflict with Pages. Keep mail and verification records intact. Do not create DNS records for a guessed Pages project name; use the account-assigned target.

Create one Cloudflare Single Redirect rule for canonical `www` handling:

- Request URL wildcard: `http*://www.kayshaven.live/*`
- Target URL: `https://kayshaven.live/${2}`
- Status: `301`
- Preserve query string: enabled

After Cloudflare issues certificates for both custom hostnames, enable **Always Use HTTPS**. The redirect above keeps the path and query string when moving `www` to the apex.

## Cutover verification and rollback

After nameserver propagation, verify authoritative NS records, apex and `www` resolution, active HTTPS certificates, HTTP-to-HTTPS behavior, the `www` redirect with a nested path and query string, `/`, `/shop.html`, `/admin/`, and `/checkout/checkout.html`. Then test the browser's API requests with the exact apex origin and confirm unapproved origins are rejected. Check email delivery and all preserved third-party DNS verifications.

For rollback, restore the previous Name.com nameserver values and the captured pre-migration DNS records. This restores the prior DNS state (which currently leads to a GitHub Pages 404), not a working previous storefront. Keep the Cloudflare zone and Pages project available until the new domain, certificate, catalogue, and API checks pass.

## Known baseline items to reconcile before production

- Current GitHub `main` has a root `CNAME` file containing `kayshaven.tech`. The static build does not copy that root file into `dist`, so it does not control Pages custom domains; it is stale for any GitHub Pages deployment and should be corrected in a reviewed Git change later.
- The public Render catalogue response previously included some null image paths and zero-price records. Verify product data and image mappings before accepting the storefront; do not modify production records as part of this DNS preparation.
- The CORS fix and test hardening are present only in this local validation checkout. They have not been committed, reviewed, or deployed. Keep production `FRONTEND_ORIGIN` aligned with the canonical apex before deploying that fix.
- Paystack remains unverified. Configure a Test Mode key only in Render after account access; never expose it in Pages, Git, logs, or chat. Keep the callback at `https://kayshaven.live/checkout/checkout.html` and do not switch to Live Mode without separate approval.
