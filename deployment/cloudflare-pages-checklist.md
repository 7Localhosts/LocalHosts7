# Kay's Haven: temporary Cloudflare Pages Direct Upload checklist

Prepared against GitHub `main` commit `ccde4bfbc3c3cf12e4d0ae4fa9fa92a6604a3fff` on 2026-10-22. The tested security/build changes are committed as `0e81091194ed051e335aecfa4668d0270f0f2a22` on `kays-haven-pages-deploy`. Cloudflare Direct Upload project `kays-haven-staging` is deployed at `https://kays-haven-staging.pages.dev`. Render's `kays-haven-backend` service builds from `kays-haven-pages-deploy`; commit `0e81091` was live at the beginning of this cutover. On 2026-10-22, the authorized Name.com account listed `kayshaven.live` (renewal Oct 22, 2027); the complete DNS inventory was reviewed. A Cloudflare Free zone was staged, then updated to point apex and `www` to the verified Pages project. Name.com saved the approved nameservers `logan.ns.cloudflare.com` and `sierra.ns.cloudflare.com`; public resolvers still need to confirm propagation and Cloudflare activation. The apex GitHub Pages A records were removed, the old `www` CNAME was updated, and the GitHub verification TXT was preserved. Keep Supabase data and Paystack settings unchanged.

## Cloudflare Pages project settings

Create a dedicated **Direct Upload** project for this temporary deployment. Upload the prebuilt `dist` folder; the project name determines its assigned `<project>.pages.dev` URL. It needs no Name.com zone or custom-domain DNS. Cloudflare documents that a Direct Upload project cannot later switch to Git integration, so keep it as the test project and create a separate Git-integrated project for ongoing deployments if needed.

| Setting | Value |
|---|---|
| Upload method | Dashboard Direct Upload of the prebuilt `dist` folder |
| Local build command | `cd src/backend && npm ci && npm run build:static` |
| Node.js version | `22` (`.node-version` is included) |
| Build API variable | `KAYS_HAVEN_API_URL=https://kays-haven-backend.onrender.com` (matches the repository's current API fallback; verify `/api/health` in Render before upload) |
| Build frontend-origin variable | `KAYS_HAVEN_FRONTEND_ORIGIN=https://kays-haven-staging.pages.dev` |
| Pages project | `kays-haven-staging`; deployed hostname `https://kays-haven-staging.pages.dev`; custom domains are being attached after zone activation |

The build script copies only `src/frontend` and `src/admin` into `dist`, then injects the public HTTPS API URL into the HTML pages. The verified output contained 207 files (134.4 MiB total); its largest file was 2.83 MiB, under Pages' 25 MiB per-file limit and 20,000-file Free plan limit. Do not put Supabase keys, Paystack keys, or any backend secret in Pages variables. The local production build completed with this API URL and the output scan found no credential patterns.

The build injects the exact HTTPS frontend origin into the generated `_headers` file and rejects wildcard, path, credential, and non-HTTPS origins. The current staging build targets `https://kays-haven-staging.pages.dev`. For the production Pages deployment, build with `KAYS_HAVEN_FRONTEND_ORIGIN=https://kayshaven.live`; keep the staging deployment built for the staging origin. Cloudflare Pages applies `_headers` rules to static responses; verify each deployment contains its exact origin. This static header does not replace the backend's separate CORS check.

The local backend change now supports a comma-separated exact `FRONTEND_ORIGINS` allowlist while retaining `FRONTEND_ORIGIN` for the canonical payment callback and backwards compatibility. Configure Render with `FRONTEND_ORIGIN=https://kayshaven.live` and `FRONTEND_ORIGINS=https://kayshaven.live,https://kays-haven-staging.pages.dev` after deploying and verifying the change. The new CORS tests cover both origins, disallowed origins, and wildcard rejection. Do not allow `*.pages.dev` or arbitrary origins. Keep Paystack in Test Mode.

The generated `dist` includes `/admin/` and `/checkout/checkout.html`. Cloudflare Pages serves the `admin/index.html` directory route and static files directly; no SPA fallback is needed.

## Temporary deployment and verification order

1. Done: the Render service is live on commit `0e81091194ed051e335aecfa4668d0270f0f2a22` from `kays-haven-pages-deploy`. Render built with Node 22 and reported zero npm vulnerabilities.
2. Done: Cloudflare project `kays-haven-staging` was created as a Direct Upload project. No custom domain or DNS was attached.
3. Done: the local production build used `KAYS_HAVEN_FRONTEND_ORIGIN=https://kays-haven-staging.pages.dev` and `KAYS_HAVEN_API_URL=https://kays-haven-backend.onrender.com`; all 207 assets uploaded successfully.
4. Done: Render `FRONTEND_ORIGIN` was changed to `https://kays-haven-staging.pages.dev` and the service redeployed successfully. The real Pages origin loaded live products and checkout prices. The backend tests on the deployed commit verify that an unapproved Pages origin receives HTTP 403 and no CORS allow-origin header. A separate live disallowed-origin browser probe was blocked by the browser URL policy, so only the deployed allowed origin was verified live.
5. Done: `/`, `/shop.html`, `/cart/cart.html`, `/checkout/checkout.html`, and `/admin/` render. The cart add/remove flow worked locally in the browser. Checkout displayed the server price. Admin remained at the staff login screen.
6. Done: health returned `{"success":true,"message":"Backend is running"}` and database readiness returned `{"success":true,"database":"connected"}`. The Pages storefront loaded the product catalogue and checkout price through the backend. No production order or payment was submitted.
7. Paystack environment variables were left unchanged, and no transaction was attempted. The deployed code accepts test-mode credentials and rejects live-mode keys; no secret was revealed.
8. Done: the authorized Name.com account lists `kayshaven.live` under My Domains; it renews Oct 22, 2027. The account has zero hosting products. Name.com's complete DNS inventory showed four apex A records to GitHub Pages, a `www` CNAME to `7localhost.github.io`, and one GitHub Pages challenge TXT record; no MX, SPF, DKIM, or DMARC records appeared. Cloudflare Free assigned `logan.ns.cloudflare.com` and `sierra.ns.cloudflare.com`. The exact pair is saved in Name.com; its UI confirms the domain is no longer using Name.com DNS. Live NS propagation and Cloudflare activation are pending.

## Name.com hosting and DNS inventory

1. Done: the authorized Name.com account lists `kayshaven.live` (renewal Oct 22, 2027) and has no hosting products. Render remains the Node API and Supabase remains the database/storage service.
2. Done: inspected the complete Name.com DNS page. Existing records were A `@` to `185.199.108.153`, `.109.153`, `.110.153`, and `.111.153`; CNAME `www` to `7localhost.github.io`; and TXT `_github-pages-challenge-bismarkamponsahasare` = `800eb87980ef0f335e802194aa2ace`. No MX/SPF/DKIM/DMARC records appeared. Before the nameserver update, live delegation was `ns1bqx.name.com`, `ns2jrt.name.com`, `ns3fqs.name.com`, and `ns4fqz.name.com` (confirmed by an NS query). The Name.com form showed generic `ns1`–`ns4.name.com` values, but its saved result now reflects the approved Cloudflare pair.
3. Done: Cloudflare Free zone for `kayshaven.live` has 3 DNS records: proxied CNAME `@` → `kays-haven-staging.pages.dev`; proxied CNAME `www` → `kays-haven-staging.pages.dev`; and the unchanged GitHub verification TXT. The Pages project confirmed its hostname `kays-haven-staging.pages.dev`.
4. Done: Name.com saved `logan.ns.cloudflare.com` and `sierra.ns.cloudflare.com` after the user’s explicit approval. Pending: public NS propagation and Cloudflare zone activation. Then add both `kayshaven.live` and `www.kayshaven.live` in Pages Custom domains, configure canonical `www` → apex redirect, and enable HTTPS after certificates are active.

## DNS cutover: approval gate

Cloudflare Pages requires the apex domain to use a Cloudflare zone and Cloudflare nameservers. The registrar remains Name.com, so this changes DNS hosting only; it does not transfer domain ownership. The user explicitly approved the cutover and Name.com saved the exact pair on 2026-10-22.

Name.com has saved the exact Cloudflare pair `logan.ns.cloudflare.com` and `sierra.ns.cloudflare.com`. The previous public delegation was `ns1bqx.name.com`, `ns2jrt.name.com`, `ns3fqs.name.com`, and `ns4fqz.name.com`. Cloudflare's Pages wizard required DNS transfer before custom-domain attachment. In advance, the zone's old GitHub Pages A and `www` records were replaced with proxied CNAMEs to the verified project `kays-haven-staging.pages.dev`; the verification TXT remains intact. No email DNS records appeared in the registrar inventory.

The expected final web records are:

| Type | Name | Target | Proxy / notes |
|---|---|---|---|
| CNAME | `@` | `kays-haven-staging.pages.dev` | Proxied; Cloudflare flattens the apex CNAME. Prefer the record created by Pages when the custom domain is activated. |
| CNAME | `www` | `kays-haven-staging.pages.dev` | Proxied; add `www.kayshaven.live` as a Pages custom domain as well. |

The old GitHub Pages apex A records and `www` CNAME have been replaced in the Cloudflare zone. Keep the verification TXT and any later-discovered service records intact. The CNAME target is the existing verified project hostname, not a guessed Pages name.

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
- Read-only checks of Render's `/api/health`, `/api/health/database`, and Pages catalogue/checkout requests passed after deployment. The database catalogue still contains null image paths, zero-price records, and active products with zero stock; verify the storefront's fallback behavior, and do not modify production records during staging.
- The CORS fix and test hardening are committed on `kays-haven-pages-deploy` and pushed to GitHub, but not merged into `main`. Render is intentionally configured to build from this branch so the exact-origin fix remains live and auto-deploys are preserved.
- Paystack environment values were not changed or exposed, and no transaction was attempted. Keep Test Mode and do not switch to Live Mode without separate approval. Keep the callback at `https://kayshaven.live/checkout/checkout.html` until domain cutover is separately approved.
