-- Phase 4: Consolidate all schema changes for member ingestion and RLS fixes
-- Date: 2026-06-29
-- Purpose: Ensure fresh DB setup reproduces the current state

-- ============================================================================
-- 1. SUBMISSION TABLE: Ensure all columns exist and proper nullability
-- ============================================================================

-- Make question_version_id nullable (pre-assessments don't have a question version)
ALTER TABLE submission
ALTER COLUMN question_version_id DROP NOT NULL;

-- Ensure personal_competence and social_competence exist
ALTER TABLE submission
ADD COLUMN IF NOT EXISTS personal_competence NUMERIC,
ADD COLUMN IF NOT EXISTS social_competence NUMERIC;

-- Add result_token for tracking submission responses (nullable initially, will be populated)
ALTER TABLE submission
ADD COLUMN IF NOT EXISTS result_token UUID DEFAULT gen_random_uuid();

-- ============================================================================
-- 2. RLS POLICIES: Fix anon role access with explicit TO clauses
-- ============================================================================

-- Drop existing policies without explicit role specifications
DROP POLICY IF EXISTS "submission_anon_insert" ON submission;
DROP POLICY IF EXISTS "submission_no_select_anon" ON submission;
DROP POLICY IF EXISTS "submission_no_update_anon" ON submission;
DROP POLICY IF EXISTS "submission_no_delete_anon" ON submission;

DROP POLICY IF EXISTS "question_version_anon_read_published" ON question_version;
DROP POLICY IF EXISTS "question_version_no_insert_anon" ON question_version;
DROP POLICY IF EXISTS "question_version_no_update_anon" ON question_version;
DROP POLICY IF EXISTS "question_version_no_delete_anon" ON question_version;

-- Recreate submission policies with explicit TO anon role
CREATE POLICY "submission_anon_insert" ON submission
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "submission_no_select_anon" ON submission
  FOR SELECT TO anon USING (false);
CREATE POLICY "submission_no_update_anon" ON submission
  FOR UPDATE TO anon USING (false);
CREATE POLICY "submission_no_delete_anon" ON submission
  FOR DELETE TO anon USING (false);

-- Recreate question_version policies with explicit TO anon role
CREATE POLICY "question_version_anon_read_published" ON question_version
  FOR SELECT TO anon USING (status = 'published');
CREATE POLICY "question_version_no_insert_anon" ON question_version
  FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "question_version_no_update_anon" ON question_version
  FOR UPDATE TO anon USING (false);
CREATE POLICY "question_version_no_delete_anon" ON question_version
  FOR DELETE TO anon USING (false);

-- ============================================================================
-- 3. SERVICE_ROLE POLICIES: Ensure service role has full access
-- ============================================================================

-- Drop and recreate service role policies with explicit grants
DROP POLICY IF EXISTS "submission_service_role_all" ON submission;
DROP POLICY IF EXISTS "question_version_service_role_all" ON question_version;
DROP POLICY IF EXISTS "member_service_role_all" ON member;

CREATE POLICY "submission_service_role_all" ON submission
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "question_version_service_role_all" ON question_version
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "member_service_role_all" ON member
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 4. VERIFICATION
-- ============================================================================

-- Log the changes
SELECT 'Phase 4 consolidation migration applied successfully' as status;

-- Verify submission table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'submission'
ORDER BY ordinal_position;

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('submission', 'question_version', 'member')
ORDER BY tablename;
