# Automated Tests

## Run

From `src/backend`:

```powershell
npm test
```

The script runs `tests/backend.test.js` followed by `tests/frontend.test.js`. CI uses Node.js 22 and runs the same command after `npm ci`.

## Coverage

- Backend utility and route checks for optional email validation, guest Paystack aliases, server-priced products, product sizes/visibility, payment-configuration failure, unpaid-order completion guards, staff-only endpoints, and the health route.
- Frontend/source assertions for product image resolution, catalogue filtering, product detail and cart wiring, checkout totals/policies, admin inventory and order controls, responsive styles, and shared navigation.
- A production-style static preview assembled in a temporary directory; required pages, assets, relative admin links, and build safety checks are asserted.
- JavaScript syntax checks are part of the repository CI workflow for the principal application scripts. For a broader local syntax scan, run `node --check` on JavaScript files under `src`, `deployment`, and `tests`.

## Limits

These tests do not open a real browser, prove visual behavior at every viewport, sign in to an actual staff account, upload to Supabase Storage, mutate Supabase data, or complete a Paystack transaction. Those flows require an approved staging project, authorized test account, and Paystack Test Mode. The suite does not claim live database or payment acceptance.
