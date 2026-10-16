# AI Usage Audit — 2026-10-16

This audit records known AI assistance for the current repository handoff. It does not replace the team's own disclosure requirements or imply authorship of existing human commits.

## Known use in this task

- Codex inspected local Git status/history, source configuration, tests, D0–D10 folder contents, backend health, and Supabase schema using read-only checks.
- Codex prepared the documentation and test matrix in this working tree from repository/GitHub evidence and actual command output.
- No live payment, database mutation, migration, PR, merge, or deployment was performed. The integration checkpoint created commits `6f2357e` (Login route/regression check), `4ef40da` (mapped product/brand assets), `3c507f8` (test/contribution evidence), `f8333c1` (push status), and `d951708` (case-safe asset directories and updated references). Their author metadata is the repository's configured local Git identity; no teammate identity was substituted. These commits and the final audit update were pushed normally to the existing origin, with no force-push.
- Secret values were not printed or written to documentation.

## Earlier AI assistance / attribution

This repository contains a large pre-existing dirty working tree with uncommitted code and images. The audit does not attribute every change in that tree to a specific person or AI tool. Git author metadata remains the primary evidence for committed work; AI assistance must not be represented as a human contribution. Team members should review these documents and add any required per-file AI disclosures they can verify.

## Human review required

- [ ] Each team member verifies the AI-use disclosure required by the course.
- [ ] Lecturer/project owner confirms the required AI audit format and approves any additional disclosure.
