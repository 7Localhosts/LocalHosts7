# Kay's Haven — Team Contribution Evidence

This lecturer-facing index lists verified public GitHub activity and makes gaps explicit. It records public GitHub usernames only. Issue assignments are not treated as proof of completed work, and original commit authorship is preserved.

For commit, branch, issue, PR, and review links plus caveats, see [D10 Contribution Evidence Index](docs/10_postmortem_final_freeze/contribution-evidence-index.md).

## Four members with verified authored commits

These accounts have public commits whose GitHub author metadata was checked. The links identify original work and do not treat later integration commits as the original authors' work.

- `Akitiiiii` — frontend foundation, product details/cart, and integrated ordering/backend commits: [3e1341e](https://github.com/7Localhosts/LocalHosts7/commit/3e1341e3a3de1b2b787ca06219b3ebca0ca26e7d), [0334605](https://github.com/7Localhosts/LocalHosts7/commit/0334605ddd431a71f7a330052b359ea9df3d7b15), [5c8e135](https://github.com/7Localhosts/LocalHosts7/commit/5c8e13581760119798fb424671684f248bf33be6); assigned issue [#3](https://github.com/7Localhosts/LocalHosts7/issues/3).
- `APAU-BENTIL-KOFI` — checkout implementation/refactor: [22d1a60](https://github.com/7Localhosts/LocalHosts7/commit/22d1a606fd01bb93e81a687869b5a801d9f97a14), [62c0421](https://github.com/7Localhosts/LocalHosts7/commit/62c0421025256df1d2d1d323f856686456ac17f8); assigned issue [#4](https://github.com/7Localhosts/LocalHosts7/issues/4). [PR #9](https://github.com/7Localhosts/LocalHosts7/pull/9) closed unmerged; the recorded review was by Copilot, not a human approval.
- `boamahbenedictelikem` — UI tokens/product-order integration commit [c088fce](https://github.com/7Localhosts/LocalHosts7/commit/c088fce2a1108131ca89e098ead385368341c9b5); the latest inspected remote branch head is [8036d32](https://github.com/7Localhosts/LocalHosts7/commit/8036d32), also authored by this account. Assigned issue [#6](https://github.com/7Localhosts/LocalHosts7/issues/6); no PR was found in the inspected evidence.
- `Akuba002` — admin branch commit [c934ae9](https://github.com/7Localhosts/LocalHosts7/commit/c934ae9555e819972b9101df7a4254bccc2eae83); assigned issue [#8](https://github.com/7Localhosts/LocalHosts7/issues/8). Branch `8-isuue7` was reported 1 ahead/15 behind `main`; no PR was found in the inspected evidence.

## Three members with issue assignments only in the inspected evidence

Issue assignments below were verified from GitHub. An assignment alone does not prove completed implementation work.

- `bismarkamponsahasare` — assigned issue [#1](https://github.com/7Localhosts/LocalHosts7/issues/1); no authored commit, PR, or review was verified.
- `Victorianketia` — assigned issue [#2](https://github.com/7LocalHosts/LocalHosts7/issues/2); no authored commit, PR, or review was verified.
- `Patrick-Newton` — assigned issue [#5](https://github.com/7LocalHosts/LocalHosts7/issues/5); no authored commit was verified. The backend baseline commit is attributed to `Akitiiiii`, not Patrick.

This evidence snapshot was reviewed on 2026-10-16 and is not a peer evaluation. The configured `origin` points to the existing public `7Localhosts/LocalHosts7` project repository. Its use as the department-approved submission destination has not been confirmed. Members should add links to activity missing from the repository only after that activity is independently verified.

## Checkpoint status

- The active local branch is `integrate-admin`. At the start of the October 16 checkpoint it contained five local commits ahead of its tracked origin branch. Those commits retain their existing author metadata; do not interpret them as contributions by the four feature-branch members above.
- This checkpoint adds `6f2357e` for the storefront Login route and its regression checks, and `4ef40da` for 73 catalogue-mapped product images plus the existing brand/landing assets. Both were created with the repository's configured local Git author name, `Maclean`; these integration commits are not attributed to another team member.
- The local project safety branch is `backup/pre-dcit208-20261016`; it is a recovery snapshot, not a team contribution.
- The checkpoint ran the existing backend/frontend test suite and 14 JavaScript syntax checks successfully. Browser evidence and limitations are recorded in `docs/06_sprint_2_quality/major-integration-test-output-2026-10-16.md`.
- Three members currently have only issue-assignment evidence in the inspected GitHub records. Ask them to provide their own authentic commit, pull request, review, and testing links if work exists elsewhere. No activity should be created on their behalf.
