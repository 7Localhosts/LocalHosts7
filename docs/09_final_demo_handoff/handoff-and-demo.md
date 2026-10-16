# Demo and Handoff Checklist

## Suggested demonstration sequence

1. Open landing page and navigate to the storefront.
2. Browse categories/search and open a published product.
3. Select a size if supported, update quantity, and add to cart.
4. Show checkout totals and optional-email behavior without submitting a live transaction.
5. Log in to a designated staging admin account and show inventory search, image status, upload, edit, hide, and restore.
6. Show a synthetic order in Active Orders and its persisted completed/canceled history state.
7. Repeat key screens at a mobile viewport.

Record the demonstration only after staging is ready. The local product endpoint currently returns 192 rows after the owner manually added products.is_active, but authenticated admin workflows, database writes, and Paystack Test Mode have not been verified in a designated staging environment.

## Human evidence placeholders

- [ ] Insert the actual final demo recording URL in `videos/youtube_links.md`.
- [ ] Add genuine desktop and mobile screenshots in this folder.
- [ ] Add client acceptance/sign-off supplied by the client.
- [ ] Add presenter names and actual contributions only after each person confirms them.
- [ ] Add test run date/environment and sanitized results from the final staging rehearsal.
- [ ] Have a human reviewer confirm these handoff instructions and record their name/date.

No recording, screenshot, approval, or handoff receipt is fabricated here.
