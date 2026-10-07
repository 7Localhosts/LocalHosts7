# Tests

Run the backend unit and health checks with `npm test` from `src/backend`.

The current suite checks email input validation, server-side product pricing,
size requirements, aggregate stock limits, the backend health endpoint and
the checkout delivery configuration endpoint, local fallback product images,
and storefront checkout/policy wiring. Supabase and Paystack end-to-end
checkout require the project migration and account credentials; use the Test
Mode acceptance checklist in `deployment/README.md` for those checks.
