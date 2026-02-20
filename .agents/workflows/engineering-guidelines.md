---
description: Run engineering guidelines checks before every GitHub push. Must be run before git add/commit/push.
---

# Engineering Guidelines Pre-Push Check

Run this workflow before EVERY push to GitHub. No exceptions.

// turbo-all

## 1. Read the Engineering Guidelines
Read `ENGINEERING_GUIDELINES.md` at the project root. Understand the current rules, especially any recent additions to the Audit Log at the bottom.

## 2. Run the Build
```bash
npx vite build 2>&1 | tail -30
```
- The build MUST pass with zero errors.
- Note any new warnings (e.g., chunk size).

## 3. Run Engine Tests
```bash
npm test 2>&1 | tail -50
```
- ALL tests MUST pass.
- If any test fails, STOP — fix it before proceeding.

## 4. Check the Browser
Open the app at `http://localhost:5173/` in the browser and verify:
- The app loads past the splash/loading screen
- Zero errors in the browser console
- The specific feature you changed works correctly

## 5. Audit Supabase RLS
Run this SQL against the Supabase project (`pudldzgmluwoocwxtzhw`):
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```
- Confirm every non-reference table has `rowsecurity = true`.
- Reference tables (`assessment_domains`, `association_competitions`, `eligibility_rules`, `vccl_regions`, `vmcu_associations`) are intentionally unprotected for anon read.
- Run the Supabase security and performance advisors.

## 6. Review Git Changes
```bash
git diff --stat
git diff
```
- Confirm all changes are intentional.
- Confirm no `.env` files, secrets, or service role keys are staged.
- Confirm no dead files or orphaned imports.

## 7. Improve the Guidelines
Based on what you observed during this check, update `ENGINEERING_GUIDELINES.md`:
- Add any new lessons, incidents, patterns, or rules discovered.
- Add an entry to the **Audit Log** at the bottom with the date and a brief summary of findings.
- If any advisory or issue was resolved, note it in the audit log.

## 8. Commit and Push
```bash
git add -A
git commit -m "<conventional commit message>"
git push origin main
```
- The commit message must follow conventional commit format (feat:, fix:, chore:, docs:, refactor:).
- Include a summary of what changed in the commit body.

## 9. Post-Push Confirmation
After pushing, confirm:
- The push succeeded with no errors.
- The branch is up to date with `origin/main`.
