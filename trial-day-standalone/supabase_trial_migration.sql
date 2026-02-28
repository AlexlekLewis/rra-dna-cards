-- Run this in your Supabase SQL Editor
ALTER TABLE public.trial_assessments 
ADD COLUMN IF NOT EXISTS overall_grade text,
ADD COLUMN IF NOT EXISTS bowling_type text;
