from pathlib import Path
from collections import Counter
import json, subprocess, datetime

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/quality'
BASE = 'f3bbeb2ff96ba1a43d6bb5abba5976873dfc1305'
TESTED = '1e9b237645ade82dd34c20e7d1b5df84f4e84118'
MAIN = 'ccde4bfbc3c3cf12e4d0ae4fa9fa92a6604a3fff'
CI = 'https://github.com/7Localhosts/LocalHosts7/actions/runs/39944749487'
REPO = 'https://github.com/7Localhosts/LocalHosts7'
now = datetime.datetime.now(datetime.timezone.utc).isoformat()
rows=[]
def row(id, req, status, actual, evidence, command='Manual source/evidence inspection', issue=4, owner='APAU-BENTIL-KOFI', code='src/backend/server.js', kind='Review', inputs='Current source and recorded evidence', expected='Requirement evidenced', sha=TESTED):
    rows.append(dict(id=id, requirement=req, issue=issue, owner=owner, code=code, type=kind, mode='Automated' if kind in ['Unit','API','Build','CI','Security scan','Integration'] else 'Manual', command=command, inputs=inputs, expected=expected, actual=actual, status=status, date='2026-10-23 UTC', sha=sha, evidence=evidence))

row('D0-01','Client/team/repository charter','FAIL','D0 README is a heading only; client/team approval not evidenced','../00_team_charter/README.md',issue=1,owner='Team lead',code='docs/00_team_charter/README.md')
row('D0-02','Client consent and human signoff','BLOCKED','No signed consent or client acceptance record supplied','UAT_DEMO_HANDOFF.md',owner='Client / team lead',code='docs/01_proposal/README.md')
row('D1-01','Proposal and historical AI records','FAIL','D1 README heading only; AI_USAGE.md absent at deployment baseline; current audit adds disclosure only','../01_proposal/README.md',owner='Team lead',code='AI_USAGE.md')
row('D2-01','Acceptance criteria traceability','PASS','Issue assignments and current code/test mapping recorded; no signed client specification claimed','ALL_D0_D10_TEST_MATRIX.md',code='docs/02_requirements/README.md')
row('D2-02','Measurable agreed NFRs','FAIL','Proposed targets documented now; prior client-agreed measurable NFRs absent','SECURITY_PRIVACY_OPERATIONS.md',owner='Client / QA',code='docs/02_requirements/README.md')
row('D3-01','Each story owner/AC/planned test','PASS','Seven original GitHub story assignments mapped to current proposed AC and test plan','UAT_DEMO_HANDOFF.md',command='Read GitHub issues 1,2,3,4,5,6,8; inspect mapped source',code='docs/03_backlog_ux/README.md')
row('D3-02','Three UX flows','PASS','Browse/cart, payment/receipt, staff/history flows documented with actual limitations','UAT_DEMO_HANDOFF.md',code='src/frontend/checkout/checkout.js')
row('D4-01','Non-placeholder root Makefile setup/lint/test/build','PASS','Actual Ubuntu Actions run executes make setup, test, lint and build successfully',CI,command='make setup && make test && make lint && make build',code='Makefile',kind='CI',inputs='Node 22, exact HTTPS build origins')
row('D4-02','Makefile run target','PASS','Actual Actions synthetic health smoke runs make run and receives HTTP200; no database call or production credentials used',CI,command='timeout 20s make run; curl --fail --retry 8 --retry-connrefused --retry-delay 1 http://127.0.0.1:18080/api/health',code='Makefile',kind='CI',inputs='Synthetic Supabase configuration and port18080',expected='Service starts and health responds')
row('D4-03','PR and push workflow coverage','PASS','QA push run passes; actual PR24 runs execute and reject missing evidence metadata as designed; main/deployment events configured',CI,command='GitHub Actions CI push and pull_request events',code='.github/workflows/ci.yml',kind='CI')
row('D4-04','PR issue/test/screenshot/AI gate','PASS','Positive/negative validator tests pass after real failed first QA run; human evidence review still required','evidence/node22-regression.log',command='node tests/quality-gate.test.js',code='deployment/quality-gate.js',kind='Unit',inputs='Blank template and explicit evidence fixture')
row('D4-05','Independent reviewer enforcement','FAIL','PR24 was merged externally by Akitiiiii despite failed evidence-gate runs; required passing-check enforcement not established','evidence/github-pr24.json',code='.github/CODEOWNERS')
row('D5-01','Historical prototype execution/review','FAIL','D5 README is heading only; historical prototype tests cannot be established from current reruns','UAT_DEMO_HANDOFF.md',code='docs/05_sprint_1/README.md')
row('D5-02','Current prototype customer flow','PASS','Browser Toys filter, product, quantity, cart and checkout summary executed','evidence/20261023-checkout-unsubmitted.png',command='Browser: Enter Shop > Toys > Kids harmonica > qty 2 > Add > cart > checkout',issue=3,owner='Akitiiiii',code='src/frontend/cart/cart.js',kind='Browser',inputs='Public product 149; no initial order submission',sha='Public runtime; sampled JS normalized hashes match '+BASE)
row('D5-03','Actual PR findings and review evidence','PASS','PR #23 human approval exists on its SHA; missing fields in PR bodies documented; no transfer of approval to QA changes','evidence/github-pr23-reviews.json',command='GET /repos/7Localhosts/LocalHosts7/pulls/23/reviews',code='.github/pull_request_template.md')
row('D6-01','Clean npm ci Node 22','PASS','Clean install exit 0; runtime v22.23.4; 0 audit findings','evidence/node22-clean-install.log',command='npm --prefix src/backend ci',code='src/backend/package-lock.json',kind='Build')
row('D6-02','Full automated regression','PASS','Existing backend/frontend assertions plus 18 input cases and 2 PR-gate cases pass; no skips',CI,command='npm --prefix src/backend test',code='tests/backend.test.js; tests/frontend.test.js; tests/order-validation.test.js; tests/quality-gate.test.js',kind='Integration')
row('D6-03','Full source/deployment JS syntax','PASS','All source/deployment/test JavaScript files checked recursively; this is syntax lint, not style lint','evidence/node22-lint.log',command='node deployment/quality-gate.js lint',code='deployment/quality-gate.js',kind='Build')
row('D6-04','Correct HTTPS static production build','PASS','Build completes with Render API and exact apex frontend origin','evidence/node22-build-production.log',command='KAYS_HAVEN_API_URL=https://kays-haven-backend.onrender.com KAYS_HAVEN_FRONTEND_ORIGIN=https://kayshaven.live make build',code='deployment/build-static.js',kind='Build')
row('D6-05','Measured coverage target','PASS','Critical order-utils: 100% lines, 88.71% branches, 100% functions; enforced >=95/80/95. Loaded application source: 62.60% lines, 67.52% branches; server 52.29% lines. Never-loaded browser files excluded; no whole-repository coverage claim','evidence/node22-coverage-critical.log',command='npm --prefix src/backend run test:coverage',code='src/backend/order-utils.js',kind='Unit')
row('D6-06','Actual defect reproduction and fix','PASS','New tests first fail 4/18 for malformed/null/unsafe quantities; focused fix passes 18/18','evidence/defect-reproduction.log',command='node tests/order-validation.test.js',code='src/backend/order-utils.js',kind='Unit',inputs='true, [2], unsafe integer, null item, valid integer strings')
row('D6-07','Main baseline regression','FAIL','Clean main npm test reproduces supabaseUrl is required; actual historical main CI also failed','evidence/main-test.log',command='cd ../LocalHosts7-qa-main/src/backend; npm ci; npm test',code='tests/backend.test.js',kind='Integration',sha=MAIN)
for id,req,actual,inputs in [
 ('CORE-01','Catalogue visibility/images','Mocked active-only projection and 73 mapped asset existence checks pass','Active/inactive products; mapped files'),
 ('CORE-02','Server pricing and tampered client prices','Server catalogue wins; inactive/missing products and invalid prices rejected','Client price 0.01 vs server 25.5'),
 ('CORE-03','Required sizes and malformed quantity','Required clothing size, unsized toys, positive safe integers checked','Clothing M/XL; toy no size; malformed quantities'),
 ('CORE-04','Optional email and required contact','Omitted email accepted; malformed provided email rejected; name/phone required','Empty email/name/phone and invalid email'),
 ('CORE-05','GHS to pesewa conversion','765.25 GHS becomes string 76525','Synthetic Paystack payload'),
 ('CORE-06','Canonical callback and rejected old callback','Production checkout callback accepted; retired Netlify, staging callback and wrong path rejected','Production/Netlify/staging/HTTP callbacks'),
 ('CORE-07','Payment status and server verification negatives','Failed/canceled/pending/wrong reference/currency/amount rejected; paid retry skips finalization double','Synthetic payment client/provider responses'),
 ('CORE-08','Receipt itemization/access/expiry unit and API','Wrong key/order, missing/expired token and failed payment denied; paid fixture itemizes correctly','Signed synthetic 24-hour token; mocked paid/failed order'),
 ('CORE-09','Order fulfillment transitions/history grouping','Unpaid completion rejected; supported status transitions and frontend history grouping checked','Paid/unpaid/failed statuses; synthetic frontend groups')]:
    row(id,req,'PASS',actual,'evidence/node22-regression.log',command='npm --prefix src/backend test',kind='API' if id in ['CORE-01','CORE-07','CORE-08'] else 'Unit',inputs=inputs)
row('CORE-10','Single stock deduction','FAIL','Latest migration deliberately removes stock decrement; requirement conflicts with shipped business rule. No live SQL changed','../../supabase/migrations/202610150002_availability_not_limited_by_legacy_stock.sql',issue=5,owner='Patrick-Newton / client',code='supabase/migrations/202610150002_availability_not_limited_by_legacy_stock.sql',inputs='Current finalizer SQL',expected='Exactly one agreed inventory deduction')
row('CORE-11','Live database duplicate/concurrent finalization','BLOCKED','No database test environment or privileged read access; mocked paid retry is not a concurrency proof','SECURITY_PRIVACY_OPERATIONS.md',issue=5,owner='Patrick-Newton',kind='Database',inputs='Same reference concurrently',expected='One order and at most one stock effect')
row('D7-01','Exact public CORS origin allowlist','PASS','Apex/staging ->204 exact ACAO; evil/lookalike/wildcard/null ->403 no ACAO','evidence/public-probes.json',command='node deployment/public-qa-probe.js',kind='API',inputs='Six documented Origin headers',sha='Public API runtime; backend deploy SHA unavailable')
row('D7-02','Auth/authz negative API tests','PASS','Unauthenticated product CRUD/upload/order changes return 401; public GET /api/orders 401','evidence/node22-regression.log',command='npm --prefix src/backend test',kind='API',inputs='No Authorization header')
row('D7-03','Authorized inventory CRUD/uploads/staff role negatives','BLOCKED','No designated staff credentials/safe write environment; one-order approval does not authorize inventory CRUD','UAT_DEMO_HANDOFF.md',issue=8,owner='Akuba002',code='src/admin/app.js')
row('D7-04','Browser XSS-like inputs','NOT EXECUTED','Escaping reviewed in source; adversarial browser payload execution not performed','SECURITY_PRIVACY_OPERATIONS.md',code='src/frontend/checkout/checkout.js',inputs='HTML/SVG/event-handler payloads',expected='Rendered as inert data without script execution')
row('D7-05','Improper storage/image uploads','BLOCKED','Unauthenticated denial and URL/storage-error helpers tested; authorized wrong MIME/signature/oversize uploads not executed','SECURITY_PRIVACY_OPERATIONS.md',issue=8,owner='Akuba002',inputs='MIME mismatch, SVG, oversized image')
row('D7-06','Supabase RLS/storage permissions','BLOCKED','Migration grants reviewed; effective live table/object policies and service-role behavior not available','SECURITY_PRIVACY_OPERATIONS.md',issue=5,owner='Patrick-Newton',code='supabase/migrations/')
row('D7-07','Missing-secret failure behavior','PASS','Missing Supabase URL fails startup rather than using synthetic production fallback; missing/live payment keys rejected in unit tests','evidence/main-test.log',command='npm --prefix src/backend test (clean main); QA getPaystackConfiguration unit cases',kind='Integration',inputs='No Supabase secrets; blank and sk_live_example payment keys')
row('D7-08','Dependency vulnerability audit','PASS','npm audit JSON reports zero vulnerabilities; no major upgrades performed','evidence/node22-audit.log',command='npm --prefix src/backend audit --json',kind='Security scan')
row('D7-09','Working tree/build/evidence secret patterns','PASS','Pattern scan found no matches; excludes binary/oversized files; not a full history or credential validity guarantee','evidence/secret-scan.json',command='node deployment/secret-scan.js',kind='Security scan')
row('D7-10','Five threats/privacy/access/AI/monitoring audit','PASS','Eight threats, access matrix, AI limits and proposed outage/monitoring expectations documented','SECURITY_PRIVACY_OPERATIONS.md',code='AI_USAGE.md')
row('D7-11','Absolute receipt-access expiry','FAIL','Token expiry passes, but public verify endpoint can renew access from the reference; absolute access expiry not enforced by demonstrated token test','SECURITY_PRIVACY_OPERATIONS.md',code='src/backend/server.js; src/frontend/checkout/checkout.js',inputs='Previously paid reference after token lifetime',expected='Agreed finite access lifetime; renewal policy explicit')
row('D8-01','DNS/TLS/www/HTTP redirects','PASS','All four hosts resolve; HTTPS reads succeed; www and HTTP apex redirect 301 to HTTPS apex','evidence/public-probes.json',command='node deployment/public-qa-probe.js',kind='API',sha='Public DNS/runtime')
row('D8-02','Production/staging core routes','PASS','Landing, shop, cart, checkout and admin return 200 HTML; API config uses correct HTTPS backend','evidence/public-probes.json',command='node deployment/public-qa-probe.js',kind='API',sha='Public runtime')
row('D8-03','API health and database','PASS','/api/health 200; correct documented /api/health/database 200 connected. Earlier guessed /api/health/ready 404 is not a product defect','evidence/public-followup.json',command='node deployment/public-qa-followup.js',kind='API',sha='Public API runtime')
row('D8-04','Published valid catalogue prices','FAIL','Public API returns 191 rows; product IDs 192,193,194 have zero price. UI hides invalid-priced rows; no data changed','evidence/public-followup.json',command='node deployment/public-qa-followup.js',issue=2,owner='Victorianketia / data owner',kind='API',sha='Public database response',expected='Every published API product has positive valid price')
row('D8-05','Current deployed frontend identity','PASS','Five key assets on each frontend match built source after CRLF normalization; receipt raw-byte difference is line endings. Backend full deploy identity not proven','evidence/public-followup.json',command='node deployment/public-qa-followup.js',kind='API',sha=BASE)
row('D8-06','Responsive full keyboard regression','NOT EXECUTED','Single current viewport inspected and admin Tab focus checked; 390/768/1440 and full keyboard paths not executed','evidence/20261023-admin-keyboard.txt',code='src/frontend/styles.css',expected='Usable at all specified widths by keyboard')
row('D8-07','Protected admin views','PASS','Public admin shows login; no order/inventory records exposed in initial UI','evidence/20261023-admin-login.png',command='Browser GET https://kayshaven.live/admin/; press Tab',issue=8,owner='Akuba002',code='src/admin/app.js',kind='Browser',sha='Public runtime')
row('D8-08','Dependency outage messages','PASS','Readiness failure doubles return sanitized 503; live payment verification failure displays retry instruction without false success','evidence/d9-retry.txt',command='npm test; browser same-reference verification retry',kind='API',inputs='Unavailable readiness fixture; live verification failure',expected='Honest retryable failure; no paid receipt')
row('D8-09','UAT/rollback/backup execution','BLOCKED','Checklist/rollback targets defined; real named client UAT and backup restore rehearsal not supplied','UAT_DEMO_HANDOFF.md',owner='Client / operations')
row('D9-01','One authorized synthetic Test Mode initialization','PASS','One initialization for product149 qty1 GHS70 with synthetic name/phone and omitted email; Paystack visibly TEST','evidence/20261023-paystack-test-mode.png',command='Browser staging checkout > Pay securely with Paystack once',issue=6,owner='boamahbenedictelikem',kind='Browser',inputs='QA Synthetic 20261023; synthetic phone; optional email empty',sha='Public runtime; explicit user approval recorded in chat')
row('D9-02','Cloudflare return and backend paid verification','FAIL','Provider returned to https://kayshaven.live/checkout/checkout; backend verification error on return and one same-reference retry. No second initialization','evidence/d9-return.txt',command='Paystack TEST mobile money 0551234987 MTN > Confirm; retry verification once',issue=6,owner='boamahbenedictelikem',kind='Browser',sha='Public runtime',expected='Backend verified paid and itemized receipt')
row('D9-03','Live itemized downloadable receipt','BLOCKED','No verified paid result; live receipt and PDF download cannot be established','evidence/20261023-payment-verification-failed.png',issue=6,owner='boamahbenedictelikem',code='src/frontend/checkout/receipt-pdf.js')
row('D9-04','One database order/admin history/inventory effect','BLOCKED','Only one UI initialization attempted, but actual count/state/history/stock require privileged read and safe staff session','UAT_DEMO_HANDOFF.md',issue=8,owner='Akuba002 / Patrick-Newton')
row('D9-05','Two additional flows','PASS','Toys filter -> product -> cart and unauthenticated admin login view executed; authorized staff flow remains blocked','evidence/20261023-toys-filter.png',command='Browser category/cart flow and /admin/ login-view flow',issue=3,owner='Akitiiiii',kind='Browser',sha='Public runtime')
row('D9-06','Manual matches current UI','PASS','Current controls compared with existing handoff guide; search/delivery/old product-count limitations documented','UAT_DEMO_HANDOFF.md',code='docs/09_final_demo_handoff/handoff-and-demo.md')
row('D9-07','Video/client acceptance','BLOCKED','PENDING actual team recording and client signoff; automation is not human acceptance','UAT_DEMO_HANDOFF.md',owner='Team / client')
for name in ['v0.0-baseline','v0.1-prototype','v0.2-beta','v0.3-staging','v0.9-rc','v1.0-demo','v1.0-handoff']:
    row('D10-'+name,'Release tag '+name,'FAIL','Absent in actual remote tag list; no SHA to verify; no late tag fabricated','evidence/remote-tags.txt',command='git ls-remote --tags origin',owner='Release owner',code='release-notes/',inputs=name,expected='Existing authentic tag peeled to real reviewed SHA',sha='No such remote tag')
row('D10-08','Release notes and final handoff','FAIL','GitHub releases list empty; client receipt/freeze/individual evidence incomplete','evidence/github-releases.json',command='GET /repos/7Localhosts/LocalHosts7/releases',owner='Release owner',code='docs/10_postmortem_final_freeze/')
row('D10-09','Current QA AI disclosure and freeze evidence','PASS','AI_USAGE, immutable tested code SHA, run URL, scan scope and evidence manifest supplied; this is QA handoff, not product release approval',CI,code='AI_USAGE.md; docs/quality/')

counts=Counter(r['status'] for r in rows)
header=f'''# All D0-D10 quality matrix

Audit generated {now}. Release criteria **NOT MET**. Counts refer to requirement-level rows, not individual assertions: **{counts['PASS']} PASS / {counts['FAIL']} FAIL / {counts['BLOCKED']} BLOCKED / {counts['NOT EXECUTED']} NOT EXECUTED** ({len(rows)} rows). Historical failed checks remain failed even after focused QA fixes; read actual results before treating totals as a pass rate.

Main baseline `{MAIN}`; deployment head `{BASE}`; tested QA code `{TESTED}`. Local commands before the code commit used the same code with a dirty working tree; execution.json records the base SHA and timestamps. Final rerun and GitHub CI establish the committed code. Documentation-only final commit may differ; executable code identity remains the tested SHA. Public runtime SHA is not inferred from a branch name; five asset normalized hashes were compared. No backend release SHA endpoint exists.

Actual passing QA CI: [{CI}]({CI}). First QA failure: [39938841749]({REPO}/actions/runs/39938841749). Main failure: [39836400603]({REPO}/actions/runs/39836400603). Logs and timestamps are under evidence/. Main/deployment were never merged or deployed by this audit. User approved the QA branch push and possible preview, and exactly one synthetic Test Mode order. No inventory CRUD, database reset, migration or DNS change was authorized/performed.

## Commands and evidence rules

Run on Node 22. `make setup`, `make lint`, `make test`, `make run`, `make build` are root targets. Build environment: KAYS_HAVEN_API_URL=https://kays-haven-backend.onrender.com and KAYS_HAVEN_FRONTEND_ORIGIN=https://kayshaven.live. Windows run-quality.ps1 records exact executable/arguments/cwd/time/exit. Evidence links are relative to this file unless HTTPS. Public probe scripts are read-only except the separately approved browser purchase. Manual rows describe actual browser steps or planned inputs; BLOCKED/NOT EXECUTED rows do not imply execution. All new evidence is dated today, never backdated.

## Requirement -> issue -> code -> test -> evidence

'''
cols=['ID / requirement','Issue / owner','Code / test type / mode','Exact command or manual steps','Input / expected','Status / actual','Date / SHA','Evidence']
text=header+'| '+' | '.join(cols)+' |\n|'+'|'.join(['---']*len(cols))+'|\n'
for r in rows:
    e=r['evidence']; eurl=e if e.startswith('https:') else e
    cells=[r['id']+' '+r['requirement'],f"[#{r['issue']}]({REPO}/issues/{r['issue']}) / {r['owner']}",r['code']+' / '+r['type']+' / '+r['mode'],r['command'],r['inputs']+' / Expected: '+r['expected'],r['status']+' - '+r['actual'],r['date']+' / '+r['sha'],f'[evidence]({eurl})']
    text+='| '+' | '.join(c.replace('|','\\|').replace('\n',' ') for c in cells)+' |\n'
text+='\n## Human actions required\n\nResolve the synthetic Test Mode verification failure using protected Render/provider/DB records; confirm actual order count/state without creating another order. Agree stock semantics and receipt renewal expiry. Obtain designated staging staff access for authorized CRUD, role/RLS/storage/concurrency tests. Correct the three zero-price catalogue records through the data owner. Run full responsive/keyboard and client UAT. Supply authentic consent, individual evidence, release records, video and handoff. Any merge, consequential deployment or late milestone tag needs explicit approval.\n'
(OUT/'ALL_D0_D10_TEST_MATRIX.md').write_text(text,encoding='utf-8')
(OUT/'matrix.json').write_text(json.dumps({'generated':now,'counts':dict(counts),'testedSha':TESTED,'rows':rows},indent=2),encoding='utf-8')
summary=f'''# Kay's Haven D0-D10 QA summary

Audit date: 2026-10-23 UTC. Team: 7Localhosts / LocalHosts7. **RELEASE CRITERIA NOT MET.**

Requirement rows: {counts['PASS']} PASS, {counts['FAIL']} FAIL, {counts['BLOCKED']} BLOCKED, {counts['NOT EXECUTED']} NOT EXECUTED; total {len(rows)}. These are requirement dispositions, not a fabricated test-case total. Existing backend/frontend suites and 20 named new tests pass on the corrected QA branch; manual checks and blocked work are separately listed.

Tested QA code: {TESTED}. Deployment baseline: {BASE}. Main: {MAIN}.

Passing CI: {CI}
First QA run failed: {REPO}/actions/runs/39938841749
Main CI failed: {REPO}/actions/runs/39836400603

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
'''
(OUT/'QA_SUMMARY.md').write_text(summary,encoding='utf-8')
print(json.dumps({'rows':len(rows),'counts':dict(counts)}))
