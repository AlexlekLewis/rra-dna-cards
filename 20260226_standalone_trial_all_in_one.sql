-- ═══ RRA TRIAL DAY ALL-IN-ONE SETUP SCRIPT ═══
-- Run this ONCE in the Supabase SQL Editor to create all required tables
-- and enable anonymous access for the standalone Vercel app.

-- =========================================================================
-- 1. CREATE TABLES
-- =========================================================================

-- 1A: TRIAL ASSESSMENTS TABLE
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

CREATE INDEX IF NOT EXISTS idx_trial_assessments_coach_date ON trial_assessments(coach_id, session_date);
CREATE INDEX IF NOT EXISTS idx_trial_assessments_player ON trial_assessments(player_id);

-- 1B: TRIAL PLAYER GROUPS TABLE
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

CREATE INDEX IF NOT EXISTS idx_trial_player_groups_date ON trial_player_groups(session_date);
CREATE INDEX IF NOT EXISTS idx_trial_player_groups_player ON trial_player_groups(player_id, session_date);

-- 1C: TRIAL SESSION PLANS TABLE
CREATE TABLE IF NOT EXISTS trial_session_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_date DATE DEFAULT CURRENT_DATE,
  session_group TEXT NOT NULL,
  rotation_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One plan per group per date
  UNIQUE(session_date, session_group)
);

CREATE INDEX IF NOT EXISTS idx_trial_session_plans_date ON trial_session_plans(session_date);

-- =========================================================================
-- 2. ENABLE ROW LEVEL SECURITY (RLS)
-- =========================================================================

ALTER TABLE trial_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_player_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_session_plans ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 3. APPLY ANONYMOUS ACCESS POLICIES FOR THE TRIAL APP
-- =========================================================================

-- Players: Allow anon to read submitted players
DROP POLICY IF EXISTS "Allow anonymous read access to active members" ON players;
CREATE POLICY "Allow anonymous read access to active members" ON players FOR SELECT TO anon USING (submitted = true);

-- Trial Player Groups: Allow anon to read, insert, update
DROP POLICY IF EXISTS "Allow anonymous read access to trial groups" ON trial_player_groups;
CREATE POLICY "Allow anonymous read access to trial groups" ON trial_player_groups FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anonymous update to trial groups" ON trial_player_groups;
CREATE POLICY "Allow anonymous update to trial groups" ON trial_player_groups FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous insert to trial groups" ON trial_player_groups;
CREATE POLICY "Allow anonymous insert to trial groups" ON trial_player_groups FOR INSERT TO anon WITH CHECK (true);

-- Trial Session Plans: Allow anon to read, insert, update
DROP POLICY IF EXISTS "Allow anonymous read access to session plans" ON trial_session_plans;
CREATE POLICY "Allow anonymous read access to session plans" ON trial_session_plans FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anonymous insert to session plans" ON trial_session_plans;
CREATE POLICY "Allow anonymous insert to session plans" ON trial_session_plans FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous update to session plans" ON trial_session_plans;
CREATE POLICY "Allow anonymous update to session plans" ON trial_session_plans FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Trial Assessments (Where coach ratings save): Allow anon to read, insert, update
DROP POLICY IF EXISTS "Allow anonymous read access to trial assessments" ON trial_assessments;
CREATE POLICY "Allow anonymous read access to trial assessments" ON trial_assessments FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anonymous insert to trial assessments" ON trial_assessments;
CREATE POLICY "Allow anonymous insert to trial assessments" ON trial_assessments FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous update to trial assessments" ON trial_assessments;
CREATE POLICY "Allow anonymous update to trial assessments" ON trial_assessments FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- BOOM. Done. All tables created, all policies set for the Vercel standalone app.

-- Allow anonymous inserts to the players table (required for CSV bulk import)
DROP POLICY IF EXISTS "Allow anonymous insert to players" ON players;
CREATE POLICY "Allow anonymous insert to players" ON players FOR INSERT TO anon WITH CHECK (true);
