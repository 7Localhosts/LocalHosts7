# Kay's Haven contribution review pack

Assigned member: Eyram
Responsibility: Admin Dashboard
Target branch: feature/7-admin-dashboard
Reference snapshot: 896be73 current admin reference plus origin/8-isuue7 original prototype

## Contribution evidence

See CONTRIBUTION-EVIDENCE.md. The prototype commit is preserved separately and not represented as authorship of current admin implementation.

## Safe use

1. Extract this ZIP into a new review folder. Project files are under reference/ or historical-reference/ so extraction cannot overwrite your working repository.
2. Review CONTRIBUTION-EVIDENCE.md and compare the files with the current repository. This is a scoped review bundle, not a complete clone or a claim that its contents were authored by the assigned member.
3. Clone https://github.com/7Localhosts/LocalHosts7.git using your own GitHub account. Do not copy this bundle over the repository wholesale; copy or edit only files needed for your genuine contribution.
4. Check git status before editing. Preserve unrelated changes and run relevant checks.
5. Commit only your own work under your own GitHub identity. Do not amend, reattribute, or fabricate historical commits.
6. Use your assigned branch name exactly: feature/7-admin-dashboard. If it exists remotely, fetch and switch to it. If it does not exist, first wait until the maintainer confirms origin/main contains verified integration commit 896be73 or a newer approved baseline. Then create it from origin/main and push only if you have repository permission:
   git switch -c feature/7-admin-dashboard origin/main
   git add <only-your-reviewed-files>
   git commit -m "<describe your genuine change>"
   git push -u origin feature/7-admin-dashboard

This pack was built from committed Git refs only. It contains no .env files, credentials, node_modules, generated builds, or private identity records.

Review the original prototype against current admin and port only relevant, tested work.