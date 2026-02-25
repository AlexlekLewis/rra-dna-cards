---
name: IT Health Agent
description: Periodic health check, vulnerability scan, common bug detection, data integrity audit, and authentication boundary validation for the RRAM DNA Cards application.
---

# IT Health Agent

Run this skill periodically (weekly, pre-deployment, post-incident) to assess the health of the RRAM DNA Cards application.

## Quick Start

Run the full health check:

1. **Build check:** `npx vite build` — must pass with zero errors
2. **Engine tests:** `npm test` — all tests must pass
3. **Common bug scan:**
   - `grep -rn "if.*\(.*use[A-Z]" src/ --include="*.jsx"` — hooks in conditionals
   - `grep -rn "setTimeout\|setInterval" src/ --include="*.jsx" --include="*.js"` — stale closure risk
   - `grep -rn "Promise.all" src/ --include="*.js" --include="*.jsx"` — destructuring alignment
4. **Security scan:**
   - `grep -rn "service_role\|secret_key\|private_key" src/ --include="*.js" --include="*.jsx"` — exposed secrets
   - Review `AuthContext.jsx` for hardcoded admin emails
   - Check Edge Functions for `verify_jwt: false`
5. **File size review:** Flag any component over 1,500 lines

## Full Instructions

See the comprehensive IT Health Agent Skills document at:
`/Users/alexlewis/.gemini/antigravity/brain/00666f18-9cf6-4c8f-a52c-12bff1024dbc/it_health_agent_skills.md`

## Health Report Template

After running checks, produce a structured health card:

```
# Health Report — [DATE]
- Build: [PASS/FAIL]
- Tests: [XX/XX pass]
- RLS: [XX/XX tables protected]
- Security: [PASS/ISSUES]
- Data Integrity: [PASS/ISSUES]
- Bug Patterns: [PASS/ISSUES]
- Bundle Size: [XXX KB]
- Status: [HEALTHY / MODERATE / CRITICAL]
```

## Trigger Conditions

- 🔄 Weekly — every Monday
- 📦 Before any deployment
- 🐛 After any bug report
- 👥 At user-count milestones (10, 25, 50, 100)
- 🔒 After any auth or RLS change
