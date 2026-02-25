-- ═══════════════════════════════════════════════════════════════════
-- SECURITY HARDENING & DATA INTEGRITY MIGRATION
-- Date: 2026-02-24
-- Scope: Phase 1 (Security) + Phase 2.1 (Assessment History)
-- ═══════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════
-- 1. NARROWED LOGIN LOOKUP — Replace broad anon SELECT on program_members
--    with a security-definer function that returns ONLY login-required fields
-- ══════════════════════════════════════════════════════════════

-- Drop the overly permissive anon policy
DROP POLICY IF EXISTS "Anon lookup for login" ON program_members;

-- Create the restricted login lookup function
CREATE OR REPLACE FUNCTION public.lookup_member_for_login(p_username text)
RETURNS TABLE(auth_user_id uuid, role text, active boolean)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql STABLE
AS $$
    SELECT pm.auth_user_id, pm.role, pm.active
    FROM program_members pm
    WHERE pm.username = lower(trim(p_username))
    LIMIT 1;
$$;

-- Grant anon access to call the function (but NOT direct table access)
GRANT EXECUTE ON FUNCTION public.lookup_member_for_login(text) TO anon;
GRANT EXECUTE ON FUNCTION public.lookup_member_for_login(text) TO authenticated;


-- ══════════════════════════════════════════════════════════════
-- 2. ASSESSMENT HISTORY TABLE — Preserve every version of coach assessments
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS assessment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    assessment_data JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE assessment_history ENABLE ROW LEVEL SECURITY;

-- Coaches and admins can view assessment history
CREATE POLICY "Authenticated users can view assessment history"
    ON assessment_history FOR SELECT TO authenticated
    USING (true);

-- Only authenticated users can insert history records
CREATE POLICY "Authenticated users can insert assessment history"
    ON assessment_history FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = created_by);

-- Index for fast lookups by player
CREATE INDEX IF NOT EXISTS idx_assessment_history_player
    ON assessment_history(player_id);

CREATE INDEX IF NOT EXISTS idx_assessment_history_created
    ON assessment_history(created_at DESC);


-- ══════════════════════════════════════════════════════════════
-- 3. DATABASE INDEXES — Address the 14 unindexed foreign keys
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_competition_grades_player ON competition_grades(player_id);
CREATE INDEX IF NOT EXISTS idx_coach_assessments_player ON coach_assessments(player_id);
CREATE INDEX IF NOT EXISTS idx_squad_allocations_squad ON squad_allocations(squad_id);
CREATE INDEX IF NOT EXISTS idx_squad_allocations_player ON squad_allocations(player_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_program ON sessions(program_id);
CREATE INDEX IF NOT EXISTS idx_session_activities_session ON session_activities(session_id);
CREATE INDEX IF NOT EXISTS idx_program_week_blocks_program ON program_week_blocks(program_id);
CREATE INDEX IF NOT EXISTS idx_coach_squad_access_squad ON coach_squad_access(squad_id);
CREATE INDEX IF NOT EXISTS idx_coach_squad_access_coach ON coach_squad_access(coach_id);
CREATE INDEX IF NOT EXISTS idx_players_auth_user ON players(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_program_members_auth_user ON program_members(auth_user_id);


-- ══════════════════════════════════════════════════════════════
-- 4. VERIFY — Run after migration to confirm
-- ══════════════════════════════════════════════════════════════

-- Check RLS is enabled on new table:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'assessment_history';

-- Test the login lookup function:
-- SELECT * FROM lookup_member_for_login('testuser');

-- Verify indexes created:
-- SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;
