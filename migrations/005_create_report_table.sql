-- Create report table for storing generated EI reports
CREATE TABLE report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES submission(id) ON DELETE CASCADE,
  state VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Published, Archived
  personal_note TEXT,
  what_you_shared TEXT,
  action_plan TEXT,
  pdf_path VARCHAR(255), -- Path to generated PDF if stored
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE report ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access
CREATE POLICY "service_role_all_access" ON report
  AS PERMISSIVE FOR ALL
  USING (TRUE)
  WITH CHECK (TRUE)
  TO service_role;

-- Allow anon to read reports
CREATE POLICY "anon_read_reports" ON report
  AS PERMISSIVE FOR SELECT
  USING (TRUE)
  TO anon;
