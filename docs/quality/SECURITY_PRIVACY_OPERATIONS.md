# D7 security, privacy and operations audit

Audit date: 2026-10-23 UTC. Scope: current deployment source, isolated QA branch, public endpoints and synthetic local doubles. No privileged Supabase/Render console was available. No migrations, DNS changes, real payments or real-order modifications were performed.

| Threat | Evidence/control | Residual risk and next action |
|---|---|---|
| Forged checkout prices or malformed quantities | Server reloads catalogue prices; 18 focused validation tests reproduce and fix coercion/null-item defects | Merge reviewed validation fix; live data still contains three zero-price records |
| Cross-origin abuse | Public OPTIONS probes accept exactly apex/staging and reject evil, lookalike, wildcard and null origins | CORS is not authentication; verify all privileged routes and add abuse/rate controls |
| Staff credential theft or privilege escalation | Unauthenticated product/order/upload routes return 401 in local API tests; public orders GET is 401 | No successful staff session/role-negative test available; inspect credential storage, session expiry and rate limiting with owner |
| Forged/replayed payment or duplicate stock changes | Test Mode key guard, server reference/currency/amount/status verification, duplicate-paid shortcut and RPC locking in source | D9 real Test Mode return fails verification; latest RPC explicitly disables stock deduction; database concurrency not executed |
| Receipt disclosure by leaked bearer reference | HMAC receipt tokens bind order/reference and expire after 24h; wrong-order/key/expired/unsigned tokens rejected | Public payment verification can renew a token from a reference. Token expiry does not prove absolute receipt-access expiry. Treat reference as sensitive; agree renewal lifetime and redact references |
| Malicious image upload/XSS | UUID storage URL allowlist, JPEG/PNG/WebP MIME/signature/size checks; frontend escaping visible in source | Authorized malformed-upload and browser XSS execution remain untested; real storage/RLS policies not verified |
| Database exposure via service-role bypass or permissive RLS | Payment/delete RPC execute grants restricted to service_role in migrations; public catalogue projection excludes private fields | Base table RLS definitions/policy exports absent. Storage migration creates public read bucket without proving object write policies. Owner must export effective grants/policies in staging |
| Secrets or customer data in bundles/logs | Redacted pattern scanner checks tracked files, dist and QA evidence; initialization diagnostics use fixed safe messages | Pattern scan is not a complete secrets/history scan. Logs contain only synthetic purchase details and public metadata; do not publish receipt bearer tokens |

## Privacy and access matrix

| Data | Public guest | Buyer | Staff | Backend service | Retention/verification |
|---|---|---|---|---|---|
| Published catalogue/images/prices | Read | Read | Authorized edit | Read/write | Public bucket intended; live policies unverified |
| Name/phone, optional email | No general list | Submit own checkout; token receipt | Authorized orders only | Process/store | Client consent, deletion policy and retention period UNVERIFIED |
| Order lines/payment status | No general list | Own signed receipt | Authorized workflow | Verify/update | Real staff/RLS isolation BLOCKED |
| Card/mobile-money secrets | Never stored by app by design | Provider-hosted Test Mode input | No access expected | Provider secret only on server | Actual dashboard mode observed TEST; no card supplied |
| Service key/signing key | None | None | No UI disclosure | Host secret manager | Rotation/host configuration owner verification pending |
| QA artifacts | Public source checks only | Synthetic records only | Team review | N/A | Keep bearer tokens out; link privileged records rather than copying them |

## AI verification audit and review expectations

AI_USAGE.md records current assistance only. Existing D0/D1 AI/client records are absent/empty; no historical disclosure inferred. Existing assertions remain. Defects were reproduced before fixing; PR gate tests caught a new validator defect and that failed run was preserved. A PR approval exists for #23 at SHA 5d4f09195b228851e9e072ba809c0bdd4455d7a1; it is not approval of this QA branch. The bot review on #23 reports quota exhaustion and is not an approval.

CODEOWNERS is a responsibility proposal derived from issue assignments, not proof of write access or required review enforcement. Before release require one independent human reviewer, relevant owner review for payment/database changes, verification of linked issue/test/screenshot/AI fields, and owner confirmation that branch protection actually enforces approvals and CI. Branch protection was not changed.

Later GitHub observation: Akitiiiii externally merged PR24 at 11:31:05 UTC into main (74791009819cc82a25a4503279b1998890362abf). Its pull_request runs rejected missing issue/test/screenshot/AI fields. This is evidence that the gate executes, but passing-check/reviewer enforcement did not prevent this merge. This agent did not merge PR24.

## Monitoring and outage expectations (proposed, not installed)

Poll /api/health and /api/health/database every 60 seconds; alert after 3 consecutive failures. Target availability 99.5% monthly and public catalogue p95 under 2 seconds on a warm service; neither is measured here. Track payment initialization/verification success, RPC failure and duplicate-finalization metrics; use safe stage/code and a hashed correlation reference, not buyer contact details or bearer tokens. Alert on any verified provider payment without a paid order after 2 minutes. Render cold starts must present a retryable message, never a false paid confirmation. Provider outages must preserve the pending reference and retry verification without creating a new order. D9 demonstrated that error message, but recovery failed.

## Rollback and backup plan (not executed)

Record immutable frontend artifact digest, backend SHA/environment version and migration ledger before a consequential release. Obtain owner approval and a verified Supabase backup/export with restore rehearsal in a separate database; proposed RPO 24h and RTO 4h need client agreement. Roll back frontend/API to the last known compatible artifacts, verify CORS, database health and a Test Mode receipt, then reopen checkout. Never reverse SQL or restore production orders blindly. No known-good paid end-to-end release has been established by this audit. DNS was left unchanged.
