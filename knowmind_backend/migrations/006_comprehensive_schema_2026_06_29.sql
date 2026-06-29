-- Comprehensive Schema Migration - 2026-06-29
-- Captures all manual Supabase changes made during Phase 3-8 development
-- This migration ensures a fresh database setup matches the current production state

-- ============================================================================
-- 1. SUBMISSION TABLE - Make question_version_id nullable (Phase 3)
-- ============================================================================
-- Raw item answers are optional - only 42 pre-assessed members have pre-computed means
ALTER TABLE submission
  ALTER COLUMN question_version_id DROP NOT NULL;

-- ============================================================================
-- 2. SUBMISSION TABLE - Add result_token tracking (Phase 4)
-- ============================================================================
-- Unique token for each submission result (PDF, shareable link, etc.)
ALTER TABLE submission
  ADD COLUMN IF NOT EXISTS result_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- ============================================================================
-- 3. SUBMISSION TABLE - Add computed competence scores (Phase 4)
-- ============================================================================
-- Personal Competence = (Self-Awareness + Self-Regulation + Motivation) / 3
-- Social Competence = (Empathy + Social & Leadership + Relationship Intelligence) / 3
ALTER TABLE submission
  ADD COLUMN IF NOT EXISTS personal_competence DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS social_competence DECIMAL(3,2);

-- ============================================================================
-- 4. MEMBER TABLE - Ensure phone and location are nullable (Phase 5)
-- ============================================================================
-- Not all members have contact info; these are optional
ALTER TABLE member
  ALTER COLUMN phone DROP NOT NULL,
  ALTER COLUMN location DROP NOT NULL;

-- ============================================================================
-- 5. RLS POLICIES - Submission table (ANON restrictions)
-- ============================================================================
-- Drop old policies to recreate with explicit role grants
DROP POLICY IF EXISTS "anon_can_insert_submissions" ON submission;
DROP POLICY IF EXISTS "anon_select_own_submissions" ON submission;
DROP POLICY IF EXISTS "service_role_full_access_submissions" ON submission;

-- ANON: INSERT only (no SELECT, UPDATE, DELETE)
CREATE POLICY "anon_insert_submissions_only" ON submission
  AS PERMISSIVE FOR INSERT
  WITH CHECK (TRUE)
  TO anon;

-- ANON: No SELECT access (explicitly restricted - anon cannot read back submissions)
-- This is intentional: assessment results are computed client-side, not read from DB

-- Service Role: Full access for admin/backend operations
CREATE POLICY "service_role_all_submissions" ON submission
  AS PERMISSIVE FOR ALL
  USING (TRUE)
  WITH CHECK (TRUE)
  TO service_role;

-- ============================================================================
-- 6. RLS POLICIES - Member table
-- ============================================================================
DROP POLICY IF EXISTS "members_visible_to_authenticated" ON member;
DROP POLICY IF EXISTS "service_role_full_access_members" ON member;

-- Service Role: Full access
CREATE POLICY "service_role_all_members" ON member
  AS PERMISSIVE FOR ALL
  USING (TRUE)
  WITH CHECK (TRUE)
  TO service_role;

-- ANON: Read-only access (for public directory, submissions, etc.)
CREATE POLICY "anon_read_members" ON member
  AS PERMISSIVE FOR SELECT
  USING (TRUE)
  TO anon;

-- ============================================================================
-- 7. RLS POLICIES - Report table (Phase 8)
-- ============================================================================
-- Service Role: Full access for generation and updates
CREATE POLICY "service_role_all_reports" ON report
  AS PERMISSIVE FOR ALL
  USING (TRUE)
  WITH CHECK (TRUE)
  TO service_role;

-- ANON: Read-only access (view generated reports)
CREATE POLICY "anon_read_reports" ON report
  AS PERMISSIVE FOR SELECT
  USING (TRUE)
  TO anon;

-- ============================================================================
-- 8. GRANT ROLE PERMISSIONS (ensure anon and service_role are defined)
-- ============================================================================
-- Note: Role grants are set up in Supabase dashboard
-- These statements ensure the roles exist and have access to the schema

-- Grant usage on schema to anon role
GRANT USAGE ON SCHEMA public TO anon;

-- Grant table access to anon
GRANT SELECT ON member TO anon;
GRANT SELECT ON submission TO anon;  -- Note: RLS policies restrict actual access
GRANT INSERT ON submission TO anon;  -- For assessment submissions
GRANT SELECT ON report TO anon;

-- Grant all to service_role (admin backend operations)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- 9. INDEXES - Query optimization
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_submission_member_id ON submission(member_id);
CREATE INDEX IF NOT EXISTS idx_submission_round ON submission(round);
CREATE INDEX IF NOT EXISTS idx_submission_created_at ON submission(created_at);
CREATE INDEX IF NOT EXISTS idx_submission_result_token ON submission(result_token);
CREATE INDEX IF NOT EXISTS idx_report_member_id ON report(member_id);
CREATE INDEX IF NOT EXISTS idx_report_submission_id ON report(submission_id);
CREATE INDEX IF NOT EXISTS idx_report_state ON report(state);
CREATE INDEX IF NOT EXISTS idx_member_name ON member(name);
CREATE INDEX IF NOT EXISTS idx_member_business ON member(business);
CREATE INDEX IF NOT EXISTS idx_member_location ON member(location);

-- ============================================================================
-- 10. COMMENTS - Schema documentation
-- ============================================================================
COMMENT ON COLUMN submission.question_version_id IS 'Foreign key to question_version. NULL for pre-assessed members with only means (no raw item answers).';
COMMENT ON COLUMN submission.result_token IS 'Unique tracking token for submission results (PDF, shareable links, etc.). Auto-generated UUID.';
COMMENT ON COLUMN submission.personal_competence IS 'Computed: (Self-Awareness + Self-Regulation + Motivation) / 3. Range: 0-5.';
COMMENT ON COLUMN submission.social_competence IS 'Computed: (Empathy + Social & Leadership + Relationship Intelligence) / 3. Range: 0-5.';
COMMENT ON TABLE report IS 'Generated EI reports for members. State: Draft, Published, Archived.';
COMMENT ON COLUMN report.state IS 'Report lifecycle: Draft (generated, editable), Published (finalized), Archived (old versions).';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- This migration captures the full schema state as of 2026-06-29 end of Phase 8
-- Fresh setup: psql -h HOST -U USER -d DB < this_migration.sql
-- Verifies: nullable columns, computed scores, result_token, RLS policies, report table
