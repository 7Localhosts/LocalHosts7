# D3/D5/D8/D9/D10 flows and human evidence

Created 2026-10-23 UTC. These are current proposed acceptance tests, not historical sprint or client signoff evidence.

## Per-story owners, acceptance criteria and tests

Issue assignments were read from GitHub today. Assignment is responsibility, not commit authorship. These proposed criteria require client validation.

| Story | Assigned owner | Current proposed acceptance criteria | Executed / planned tests |
|---|---|---|---|
| #1 Homepage & Navigation | bismarkamponsahasare | Landing Enter Shop reaches catalogue; shop/category/contact links work; keyboard skip link reaches main | D5-02 landing navigation executed; full keyboard/responsive plan D8-06 pending |
| #2 Products & Categories | Victorianketia | Eight category filters synchronize selection and show matching active products; published prices positive; images have honest fallbacks | Toys filter and asset tests pass; live zero-price records fail D8-04; all-category visual review planned |
| #3 Product Details & Cart | Akitiiiii | Correct product price/image/size options; safe positive whole quantity; cart totals equal sum of server-priced lines | CORE-02/03 unit checks and D5-02 sampled browser flow pass; cross-browser/invalid keyboard inputs planned |
| #4 Checkout & Customer Orders | APAU-BENTIL-KOFI | Name/phone required; email optional but valid if present; client price ignored; one initialization per purchase | CORE-02/04 pass; D9 single synthetic initialization executed; actual DB count pending |
| #5 Backend & database | Patrick-Newton | Health separates process/database state; private routes deny anonymous access; payment transaction is atomic/idempotent under agreed stock rule | D8-03 and auth negatives pass; RLS/concurrency/stock acceptance blocked or failed |
| #6 Payments, Contacts and Reviews | boamahbenedictelikem | Only Test Mode; GHS pesewas correct; canonical callback; paid verification precedes receipt; public contact links work | CORE-05/06/07 unit/API doubles pass; actual D9 paid verification fails; contact targets inspected, no messages sent; reviews flow not executed |
| #8 Admin dashboard (issue titled Isuue#7) | Akuba002 | Staff login protects data; authorized inventory/image CRUD; paid-only completion; completed/canceled history persists | Login view/auth negatives/transitions/grouping pass; authorized writes/login/history and upload failures blocked |

Measurable proposed NFRs: pricing/transition module >=95% line and function coverage and >=80% branch coverage (enforced); public warm catalogue p95 <2s and availability >=99.5% monthly (not measured); core flows at 390/768/1440px and keyboard-only (pending); receipt token TTL 24h (tested), absolute renewal policy unresolved; backup RPO24h/RTO4h (proposed, not rehearsed). No client agreement inferred.

## Three UX flows and current acceptance criteria

1. Customer browse: landing -> Enter Shop -> Toys -> product details -> quantity -> cart -> checkout. Only Toys remain selected; catalogue price wins, unsized toys show None/N/A, quantity is a positive integer, and totals match GHS line totals. Owner: issue #2 Victorianketia; #3 Akitiiiii; #4 APAU-BENTIL-KOFI. Browser filter/cart/summary checks executed; recorded screenshots. Full responsive/keyboard matrix pending.
2. Customer payment/receipt: one synthetic item -> required name/phone, omitted email -> provider visibly TEST -> canonical production Cloudflare return -> backend paid verification -> itemized PDF. Issue #6 boamahbenedictelikem and #4 APAU-BENTIL-KOFI. Executed once with explicit live-database-write approval. Provider returned to apex; backend verification failed, including one same-reference retry. No second order initialization was attempted. Receipt download and database uniqueness are NOT proven. Owner must inspect the synthetic reference in protected Render/Paystack/Supabase tools; no new transaction should be created to investigate this attempt.
3. Staff inventory/order flow: staff login -> authorized product/image CRUD -> synthetic paid order -> Completed/Canceled -> history. Issue #8 Akuba002 and #5 Patrick-Newton. Login view and unauthenticated negatives checked; authenticated flow BLOCKED without designated staff credentials/safe write environment. Inventory writes were not authorized by the one-order approval and were not executed.

## UAT checklist

| Check | Expected | Actual tester / result |
|---|---|---|
| Browse/filter/product/cart/checkout summary | Correct prices, quantities and category state | Codex browser automation, 2026-10-23; passed sampled flow; not client UAT |
| Optional email; required name/phone | Blank email accepted, missing contact rejected | Local automated functions pass; synthetic live initialization omitted email |
| Test Mode payment and receipt | Return to apex, verified paid, downloadable itemized PDF | Codex, 2026-10-23; FAIL at backend verification; receipt blocked |
| Desktop/mobile/tablet | 1440, 768, 390px; no clipping or inaccessible controls | NOT EXECUTED across required widths |
| Keyboard only | Tab/Shift+Tab, Enter/Space, visible focus, escape drawer and meaningful errors | One admin Tab reached shop link; full keyboard flow NOT EXECUTED |
| Staff create/edit/upload/status history | Only authorized role can change synthetic records | BLOCKED; no designated credentials/sandbox |
| Outages | Honest retryable messaging; no duplicate orders | Local readiness doubles pass; live verification error message seen; provider outage/recovery not induced |
| Client review/video/handoff | Actual named tester, date, acceptance and recording URL | PENDING team/client; no approval or video fabricated |

## Manual verification of existing handoff instructions

docs/09_final_demo_handoff/handoff-and-demo.md accurately describes the landing/shop, size/quantity/cart, optional-email and staff login controls. Its instruction to browse categories/search is only partly verified: category browsing works, a search UI was not established by this run. Its 192-product count is historical: current public API returned 191 rows. Current customer form has name, phone and optional email; no delivery address or payment-method selector before hosted Paystack. Do not present old checkout PR #9's delivery/address UI as current functionality. Staff screens/history/upload and mobile instructions remain unverified. A current walkthrough should warn that Test Mode verification failed and should not promise receipt generation until fixed.

## Prototype, freeze and individual evidence

D5 README is a heading only; no newly executed current test is backdated to the prototype sprint. All seven requested release tags are absent in the remote tag listing; existing archive tags are not milestone releases. GitHub releases list is empty. No late tags were created. If the team requests late tags, obtain explicit approval, choose actual reviewed SHAs, and record true creation timestamps.

Original issue assignments are confirmed from GitHub. They are not proof of commit authorship. Retain docs/10_postmortem_final_freeze/contribution-evidence-index.md as historical evidence, but its older missing-contribution statements require rechecking against newer PRs. #23 has an actual Akuba002 approval on its own commit. Each member still needs their own issue, authored commit, PR, review and dated test links. Client handoff, privacy consent and final release freeze remain pending.
