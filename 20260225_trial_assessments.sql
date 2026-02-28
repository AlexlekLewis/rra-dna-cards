-- ═══ TRIAL ASSESSMENTS TABLE ═══
-- Sandboxed table for trial-day rapid coach assessments
-- Separate from production coach_assessments

CREATE TABLE IF NOT EXISTS trial_assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES auth.users(id),
  session_date DATE DEFAULT CURRENT_DATE,

  -- 12 rapid ratings (1-5 scale)
  batting_technique SMALLINT CHECK (batting_technique BETWEEN 1 AND 5),
  bowling_skill SMALLINT CHECK (bowling_skill BETWEEN 1 AND 5),
  power_hitting SMALLINT CHECK (power_hitting BETWEEN 1 AND 5),
  strike_rotation SMALLINT CHECK (strike_rotation BETWEEN 1 AND 5),
  game_awareness SMALLINT CHECK (game_awareness BETWEEN 1 AND 5),
  decision_making SMALLINT CHECK (decision_making BETWEEN 1 AND 5),
  pressure_handling SMALLINT CHECK (pressure_handling BETWEEN 1 AND 5),
  coachability SMALLINT CHECK (coachability BETWEEN 1 AND 5),
  athleticism SMALLINT CHECK (athleticism BETWEEN 1 AND 5),
  ground_fielding SMALLINT CHECK (ground_fielding BETWEEN 1 AND 5),
  catching SMALLINT CHECK (catching BETWEEN 1 AND 5),
  running_bw SMALLINT CHECK (running_bw BETWEEN 1 AND 5),

  -- Archetypes
  batting_archetype TEXT,
  bowling_archetype TEXT,

  -- Squad recommendation
  squad_rec TEXT CHECK (squad_rec IS NULL OR squad_rec IN ('move_up', 'right_level', 'move_down')),

  -- Quick note
  quick_note TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One assessment per player per coach per day
  UNIQUE(player_id, coach_id, session_date)
);

-- ═══ ROW LEVEL SECURITY ═══
ALTER TABLE trial_assessments ENABLE ROW LEVEL SECURITY;

-- Coaches can manage their own trial assessments
CREATE POLICY "Coaches manage own trial assessments"
  ON trial_assessments
  FOR ALL
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

-- Admins can read all trial assessments
CREATE POLICY "Admins read all trial assessments"
  ON trial_assessments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_trial_assessments_coach_date
  ON trial_assessments(coach_id, session_date);

CREATE INDEX IF NOT EXISTS idx_trial_assessments_player
  ON trial_assessments(player_id);
