-- Create audit table for tracking report edits and approvals (Phase 9)
CREATE TABLE audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES report(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'save', 'approve', 'send', 'hold', 'reject'
  changed_fields JSONB, -- {personal_note: true, what_you_shared: false, action_plan: true}
  old_values JSONB, -- Previous values of changed fields
  new_values JSONB, -- New values of changed fields
  notes TEXT, -- Any notes from reviewer
  created_by VARCHAR(255), -- Email or name of who made the change
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE audit ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "service_role_all_audit" ON audit
  AS PERMISSIVE FOR ALL
  USING (TRUE)
  WITH CHECK (TRUE)
  TO service_role;

-- ANON read-only (can see audit trail)
CREATE POLICY "anon_read_audit" ON audit
  AS PERMISSIVE FOR SELECT
  USING (TRUE)
  TO anon;

-- Indexes for common queries
CREATE INDEX idx_audit_report_id ON audit(report_id);
CREATE INDEX idx_audit_member_id ON audit(member_id);
CREATE INDEX idx_audit_action ON audit(action);
CREATE INDEX idx_audit_created_at ON audit(created_at);
