-- ═══ TRIAL PLAYER GROUPS TABLE ═══
-- Maps players to trial session groups (Group 1, 2, 3)
-- Also tracks attendance check-in by any coach
-- Completely sandboxed — does NOT alter any existing tables

CREATE TABLE IF NOT EXISTS trial_player_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL,
  group_label TEXT NOT NULL,
  session_date DATE DEFAULT CURRENT_DATE,

  -- Attendance tracking
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_by UUID REFERENCES auth.users(id),
  checked_in_at TIMESTAMPTZ,

  UNIQUE(player_id, session_date)
);

-- ═══ ROW LEVEL SECURITY ═══
ALTER TABLE trial_player_groups ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read groups
CREATE POLICY "Authenticated users read trial groups"
  ON trial_player_groups
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Coaches and admins can manage groups + attendance
CREATE POLICY "Coaches and admins manage trial groups"
  ON trial_player_groups
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'coach')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'coach')
    )
  );

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_trial_player_groups_date
  ON trial_player_groups(session_date);
CREATE INDEX IF NOT EXISTS idx_trial_player_groups_player
  ON trial_player_groups(player_id, session_date);
