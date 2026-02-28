-- ═══ TRIAL SESSION PLANS TABLE ═══
-- Stores rotation plans for trial sessions as JSONB
-- Completely sandboxed — does NOT alter any existing tables

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

-- ═══ ROW LEVEL SECURITY ═══
ALTER TABLE trial_session_plans ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read session plans
CREATE POLICY "Authenticated users read session plans"
  ON trial_session_plans
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Coaches and admins can manage session plans
CREATE POLICY "Coaches and admins manage session plans"
  ON trial_session_plans
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
CREATE INDEX IF NOT EXISTS idx_trial_session_plans_date
  ON trial_session_plans(session_date);
