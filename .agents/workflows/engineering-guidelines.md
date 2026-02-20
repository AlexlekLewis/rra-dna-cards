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

## 4. Code Quality Scan
Before going to the browser, do a targeted scan of every file you modified in this session. For EACH changed file, verify:

### React Hooks Rules (MOST COMMON CRASH SOURCE)
```bash
# List all changed files
git diff --name-only HEAD
```
For each changed `.jsx` file, check:
- **No hooks inside conditionals** — search for `useState`, `useRef`, `useEffect`, `useMemo`, `useCallback` and confirm EVERY call is at the top level of the component, not inside `if`, `for`, loops, or nested functions
- **No hooks inside render helper functions** (e.g., `const renderTab = () => { const [x, setX] = useState(...) }`) — hooks must be in the main component body only

### Closure & State Freshness
For each changed file using `setTimeout`, `setInterval`, or debounced callbacks:
- Confirm the callback does NOT directly reference React state variables (`players`, `pd`, etc.) — they will be stale
- Instead, use a `useRef` (declared at top level) to hold the latest value
- If using `setPlayers(ps => ...)` functional updater pattern, confirm the updater uses its parameter (`ps`), not the outer `players` variable

### Data Shape Alignment
For each new or changed data read/write (Supabase query, JSONB field access):
- Trace every READER of the data and confirm it matches the WRITER's shape
- Check key names, nesting depth, and value types
- Example: if writer stores `{ steps: { 0: {...} } }`, reader must not look for `step_0` at root

### Import/Export Consistency
For each new or changed import:
- Confirm the imported name matches the actual export (default vs named)
- Confirm the imported path is correct (especially after file moves)
- Confirm no unused imports remain
- Confirm no circular imports were introduced

### Destructuring Safety
For each `Promise.all` destructuring or array destructure:
- Confirm the number of variables matches the number of promises/items
- Confirm the order matches

## 5. Check the Browser
Open the app at `http://localhost:5173/` in the browser and verify:
- The app loads past the splash/loading screen
- Zero errors in the browser console
- Navigate to EVERY view touched by the change (Coach Portal, Admin tabs, Player onboarding)
- The specific feature you changed works correctly
- Test at least one interaction (click a button, change a value, navigate between tabs)

## 6. Audit Supabase RLS
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

## 7. Cross-Zone Safety Check
- Confirm no Landing Page Zone tables were modified (`applications`, `pipeline_stages`, `pipeline_entries`, `pipeline_activity_log`, `offer_tokens`, `offer_responses`, `dashboard_users`)
- Confirm no migrations affect landing page tables
- Confirm no Edge Function name collisions between zones

## 8. Review Git Changes
```bash
git diff --stat
git diff
```
- Confirm all changes are intentional.
- Confirm no `.env` files, secrets, or service role keys are staged.
- Confirm no dead files or orphaned imports.
- If file was renamed or moved, confirm all imports in other files were updated.

## 9. Improve the Guidelines
Based on what you observed during this check, update `ENGINEERING_GUIDELINES.md`:
- Add any new lessons, incidents, patterns, or rules discovered.
- Add an entry to the **Audit Log** at the bottom with the date and a brief summary of findings.
- If any advisory or issue was resolved, note it in the audit log.
- If a new common mistake emerged, add it to the COMMON MISTAKES section.

## 10. Commit and Push
```bash
git add -A
git commit -m "<conventional commit message>"
git push origin main
```
- The commit message must follow conventional commit format (feat:, fix:, chore:, docs:, refactor:).
- Include a summary of what changed in the commit body.

## 11. Post-Push Confirmation
After pushing, confirm:
- The push succeeded with no errors.
- The branch is up to date with `origin/main`.
