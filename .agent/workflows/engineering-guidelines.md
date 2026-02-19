---
description: Review engineering guidelines before starting any task on the RRAM DNA Cards project
---

# Engineering Guidelines Review

Before starting any new task or feature on the RRAM DNA Cards project, follow this workflow:

## Pre-Task Checklist

1. **Read the Engineering Guidelines**
   - Open and review `ENGINEERING_GUIDELINES.md` at the project root
   - Pay special attention to Supabase-specific rules, RLS requirements, and Rating Engine Protection Rules

2. **Classify the Change**
   - Does this touch engine code or data? → Follow the Engine Change Checklist in the guidelines
   - Does this add a new portal or module? → Follow the Growth-Aware Architecture Rules
   - Does this modify skill item arrays? → STOP — this is the highest-risk change in the codebase

3. **Follow the Feature Development Workflow**
   - STEP 1: Understand the requirement
   - STEP 2: Assess impact on existing files, functionality, data, and the rating engine
   - STEP 3: Propose the approach (component structure, schema changes, RLS policies)
   - STEP 4: Confirm with the developer before proceeding on significant changes
   - STEP 5: Build with clean, commented, maintainable code following module boundary rules
   - STEP 6: Verify, clean up, run engine tests if applicable, confirm no data was affected

4. **Hard Stop Checks**
   - Confirm you are NOT about to:
     - Delete or overwrite Supabase data without explicit confirmation
     - Skip RLS policies
     - Hardcode credentials or API keys
     - Access data without authentication checks
     - Remove error handling for convenience
     - Add large, unvetted dependencies
     - Reorder or insert into skill arrays without a data migration plan
     - Change engine constants or domain weights without impact analysis
     - Ship mock data to production

5. **Post-Task Verification**
   - The app must be in a working state
   - No dead files or orphaned code remain
   - RLS policies are confirmed for any new tables
   - Engine tests pass if calculation logic was touched
   - All changes are committed or checkpointed
