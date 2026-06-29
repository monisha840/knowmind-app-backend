-- Migration: Add missing columns to submission table for Phase 3 assessment
-- Date: 2026-06-29
-- Purpose: Support question_version tracking and competence scoring in submissions

-- Add missing columns to submission table
ALTER TABLE submission
ADD COLUMN IF NOT EXISTS question_version_id UUID REFERENCES question_version(id),
ADD COLUMN IF NOT EXISTS personal_competence NUMERIC,
ADD COLUMN IF NOT EXISTS social_competence NUMERIC;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'submission'
ORDER BY ordinal_position;
