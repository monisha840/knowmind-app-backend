-- Fix RLS policies: explicitly specify TO anon role for anon-accessible operations

-- Drop and recreate submission policies with explicit anon role
DROP POLICY IF EXISTS "submission_anon_insert" ON submission;
DROP POLICY IF EXISTS "submission_no_select_anon" ON submission;
DROP POLICY IF EXISTS "submission_no_update_anon" ON submission;
DROP POLICY IF EXISTS "submission_no_delete_anon" ON submission;

-- Recreate with explicit TO anon role
CREATE POLICY "submission_anon_insert" ON submission
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "submission_no_select_anon" ON submission
  FOR SELECT TO anon USING (false);
CREATE POLICY "submission_no_update_anon" ON submission
  FOR UPDATE TO anon USING (false);
CREATE POLICY "submission_no_delete_anon" ON submission
  FOR DELETE TO anon USING (false);

-- Drop and recreate question_version policies with explicit anon role
DROP POLICY IF EXISTS "question_version_anon_read_published" ON question_version;
DROP POLICY IF EXISTS "question_version_no_insert_anon" ON question_version;
DROP POLICY IF EXISTS "question_version_no_update_anon" ON question_version;
DROP POLICY IF EXISTS "question_version_no_delete_anon" ON question_version;

-- Recreate with explicit TO anon role
CREATE POLICY "question_version_anon_read_published" ON question_version
  FOR SELECT TO anon USING (status = 'published');
CREATE POLICY "question_version_no_insert_anon" ON question_version
  FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "question_version_no_update_anon" ON question_version
  FOR UPDATE TO anon USING (false);
CREATE POLICY "question_version_no_delete_anon" ON question_version
  FOR DELETE TO anon USING (false);

-- Member: Keep all blocked for anon (no SELECT access for RLS FK verification)
-- This requires submissions to either:
-- a) NOT reference members (use NULL member_id), OR
-- b) Allow anon to verify FK exists via SELECT (with minimal permissions)
-- Since submissions use nullable member_id, no change needed here

-- Audit: All blocked for anon (no change needed)

-- Add service_role full-access policies for service role operations
CREATE POLICY "submission_service_role_all" ON submission
  FOR ALL TO service_role USING (true);
CREATE POLICY "question_version_service_role_all" ON question_version
  FOR ALL TO service_role USING (true);
CREATE POLICY "member_service_role_all" ON member
  FOR ALL TO service_role USING (true);
