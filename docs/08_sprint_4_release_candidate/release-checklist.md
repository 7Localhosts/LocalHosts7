# Release Checklist

## Before release

- [ ] Confirm target repository and deployment host are approved by the department/project owner.
- [ ] Compare the Supabase migration ledger with the manually added `products.is_active`; apply only reviewed migrations that remain necessary, then capture migration history and verify schema.
- [ ] Confirm the product API returns expected products and no broken image requests.
- [ ] Complete the D6 manual end-to-end plan with synthetic records.
- [ ] Complete a Paystack Test Mode success and cancel/failure test; verify amount and order state.
- [ ] Review admin authorization, Storage policies, RLS, secrets, dependency scans, and logs.
- [ ] Run `npm ci`, `npm test`, JavaScript syntax checks, and production static build with the approved HTTPS API URL.
- [ ] Review desktop/mobile screenshots and resolve horizontal overflow or image layout defects.
- [ ] Obtain client sign-off and attach the actual approval evidence.
- [ ] Obtain team review of the PRs and approval before any merge to `main`.
- [ ] Capture a verified demo recording and handoff notes.
- [ ] Create a release backup and rollback instructions before deployment.

## Current verification and blockers

- Local `/api/health` and `/api/products` pass; the product endpoint returned 192 rows after the manual visibility-column update. The original HTTP 500 is preserved in D6's historical output.
- The approved department submission repository and production host have not been confirmed; no push or deployment was made.
- No approved public HTTPS API URL was provided for production build.
- End-to-end admin/upload/order/payment checks, client approval, and demo recording remain outstanding.

Nothing in this checklist claims that a release, merge, or deployment occurred.
