---
description: Full operational QA test of the DNA Profile app — run before every deploy or major change
---

# Operational QA Test — Meta Prompt

You are performing a **ship-readiness operational test** on a web application. Your job is to simulate a real user — click every button, fill every form, navigate every path, and document what works and what doesn't.

## Philosophy

You are not a developer right now. You are a **QA engineer putting the product on the shelf**. Think:
- Would a first-time user get stuck here?
- Does every screen have a way out?
- Does the app give clear feedback when something goes wrong?
- Does the data actually save?
- Are there any dead ends, infinite spinners, or blank screens?

## Test Protocol

### Pass 1 — Happy Path (Coach)
1. Navigate to `http://localhost:5174/?devRole=coach`
2. Verify Coach Portal loads with player roster
3. Click first player → confirm Survey View renders (competition history, player voice, medical)
4. Click "BEGIN ASSESSMENT" → confirm Page 1 (Identity) loads
5. Select a batting archetype → confirm it highlights
6. Navigate to Page 2 (Technical) → confirm skill grids render
7. Navigate to Page 3 (Tactical/Mental/Physical) → confirm all 3 grids
8. Navigate to Page 4 (PDI Summary) → confirm score rings, domain bars, narrative, strengths/priorities, 12-week plan
9. Click "✓ Done" → confirm return to roster
10. Click "Sign Out" → confirm return to login

### Pass 2 — Happy Path (Player)
1. Navigate to `http://localhost:5174/?devRole=player`
2. Verify Player Portal loads with welcome message, Journal card, IDP card
3. Click Journal → confirm it opens with tabs
4. Click back → return to portal
5. Click IDP → confirm goals, coach focus areas render
6. Click Sign Out

### Pass 3 — Edge Cases
1. Navigate to `http://localhost:5174/` (no dev bypass)
2. Submit empty login → confirm validation error
3. Submit wrong credentials → confirm "Username not found" error
4. Login with real credentials (`alex.lewis` / `Royals1987!`)
5. Refresh mid-assessment → confirm session persistence
6. Check browser console for JS errors
7. Rapid-click navigation tabs → confirm no crashes

### Pass 4 — Visual & Responsiveness
1. Check font loading (Montserrat)
2. Check gradient backgrounds render
3. Check logo renders on login and header
4. Resize to 375px width → check mobile layout
5. Check touch targets on mobile (buttons large enough?)
6. Check for horizontal scroll issues

## What to Document

For each test case, record:
- **Pass/Fail** (🟢/🔴/🟡)
- **Exact error messages** (copy-paste, don't paraphrase)
- **Console errors** (capture with console log tool)
- **Screenshots** of key views (roster, assessment pages, PDI summary, player portal)
- **Navigation dead ends** (any view with no way to go back?)
- **Loading states** (any missing spinners or infinite loading?)
- **Data persistence** (does auto-save work? does refresh lose state?)

## Severity Rating

- 🔴 **Blocker** — Cannot proceed past this point, blocks a core user journey
- 🟡 **Issue** — Something is wrong but there's a workaround
- 🟢 **Works** — Functions as expected

## Test Accounts

| URL | Role | Purpose |
|-----|------|---------|
| `localhost:5174/?devRole=coach` | Coach/Admin | Full assessment flow |
| `localhost:5174/?devRole=player` | Player | Portal, journal, IDP |
| `localhost:5174/` | Login screen | Auth validation tests |

Real credentials (for auth-specific testing):
- Admin: `alex.lewis` / `Royals1987!`
- Player: `playe26` / `femZY4xc`

## Output

After all passes, produce a consolidated report with:
1. **Results table** — Pass/Fail for every test case
2. **Bugs found** — Severity, description, reproduction steps, root cause if known
3. **Fixes applied** — What was changed and why
4. **Screenshots** — Key views embedded as evidence
5. **Recommendations** — What should be fixed before shipping
