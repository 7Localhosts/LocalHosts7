# Kay's Haven D0-D10 QA summary

Audit date: 2026-10-23 UTC. Team: 7Localhosts / LocalHosts7. **RELEASE CRITERIA NOT MET.**

Requirement rows: 40 PASS, 18 FAIL, 9 BLOCKED, 2 NOT EXECUTED; total 69. These are requirement dispositions, not a fabricated test-case total. Existing backend/frontend suites and 20 named new tests pass on the corrected QA branch; manual checks and blocked work are separately listed.

Tested QA code: 1e9b237645ade82dd34c20e7d1b5df84f4e84118. Deployment baseline: f3bbeb2ff96ba1a43d6bb5abba5976873dfc1305. Main: ccde4bfbc3c3cf12e4d0ae4fa9fa92a6604a3fff.

Passing CI: https://github.com/7Localhosts/LocalHosts7/actions/runs/39944749487
First QA run failed: https://github.com/7Localhosts/LocalHosts7/actions/runs/39938841749
Main CI failed: https://github.com/7Localhosts/LocalHosts7/actions/runs/39836400603

## What passed

Clean npm ci, regression, recursive JavaScript syntax lint, HTTPS production static build and critical pricing/transition coverage gate ran under Node 22.23.4. npm audit reported zero known vulnerabilities. Order utility coverage measured 100% lines, 88.71% branches and 100% functions; loaded application source measured 62.60% lines and 67.52% branches. Server line coverage is only 52.29%; never-loaded browser files are outside that denominator.

Public DNS/TLS and HTTP/www redirects work. Both Cloudflare sites serve the core routes with the Render API. Required origins are allowed and four hostile/wildcard/null origins rejected. API/database health are connected. Sampled public frontend asset hashes match the deployment source after line-ending normalization. Browser checks cover category filtering, product quantity, cart arithmetic, checkout itemization and staff login. Both original carts were restored.

## Fixed and preserved failures

Malformed cart input tests first failed four cases: true/[2]/unsafe quantity coercion and a null item TypeError. The focused validation fix passes all 18 new input cases without weakening existing assertions. The new PR metadata validator also had a newline bug: its negative test failed locally and in CI. That defect was fixed and a real subsequent CI run passed. Original logs remain in the evidence folder.

## Release blockers

One user-approved synthetic GHS70 purchase reached Paystack visibly in TEST mode, with optional email omitted. The provider returned to the production Cloudflare checkout. Backend paid verification failed on return and one same-reference retry. No second initialization was attempted. No live paid receipt, receipt download, exact database order count, admin history or inventory effect was proven. Owner investigation needs protected Render/Paystack/Supabase records. No real payment details or real orders were used.

The latest migration deliberately disables stock deduction, conflicting with the requested single deduction rule. Three public API products (192-194) have zero prices. Receipt tokens expire in isolation, but reference-based renewal leaves the absolute access lifetime unresolved. Privileged auth/RLS/storage/CRUD and concurrency remain blocked. Full responsive and keyboard UAT remains unexecuted. D0/D1/D3/D5 records contain placeholders; client consent and acceptance are unverified. All seven requested milestone tags are absent and GitHub releases are empty. No historical tags, tests, reviewers or contributions were invented.

## Deployment and next actions

This agent pushed only the approved QA branch. During the audit Akitiiiii externally merged PR24 into main at 74791009819cc82a25a4503279b1998890362abf, despite failed PR evidence-gate runs. This agent performed no merge or production deployment. A preview may be produced by hosting branch rules; no preview success is claimed without evidence. A human reviewer must approve the QA changes before merge. Team owners must investigate the synthetic payment, agree stock/receipt-expiry rules, provide a safe staff/database environment, run missing manual tests and supply genuine video/client/handoff records. No late tag, migration, rollback, DNS change or real payment was performed.

## Evidence and redaction

Full requirement/issue/code/test/command/input/expected/actual/date/SHA/owner mapping: docs/quality/ALL_D0_D10_TEST_MATRIX.md. D7 threats/privacy/monitoring/rollback: SECURITY_PRIVACY_OPERATIONS.md. UAT and manual/UI limits: UAT_DEMO_HANDOFF.md. Raw evidence is in docs/quality/evidence; keep synthetic references and privileged records out of public submissions. Pattern scan scope is tracked working tree, built assets and QA artifacts, not a complete history/credential-validity guarantee. No secrets or receipt bearer tokens are included in this summary. Human signoff and video remain PENDING. Final observed remote main is 74791009819cc82a25a4503279b1998890362abf; deployment branch remains f3bbeb2ff96ba1a43d6bb5abba5976873dfc1305.
