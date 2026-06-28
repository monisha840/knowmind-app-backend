-- Enable RLS
ALTER DATABASE postgres SET session_preload_libraries = 'pg_stat_statements';

-- member table
CREATE TABLE member (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE,
  location TEXT,
  business TEXT,
  gender TEXT,
  marital_status TEXT,
  status TEXT DEFAULT 'active',
  lead_priority TEXT,
  follow_up_date DATE,
  notes TEXT,
  tags TEXT[],
  communication_preference TEXT DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- question_version table
CREATE TABLE question_version (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_no INTEGER NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  items JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- submission table
CREATE TABLE submission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES member(id) ON DELETE CASCADE,
  round TEXT NOT NULL CHECK (round IN ('pre', 'mid', 'post')),
  question_version_id UUID NOT NULL REFERENCES question_version(id),
  raw_answers JSONB,
  domain_scores JSONB NOT NULL,
  overall NUMERIC NOT NULL,
  personal_competence NUMERIC,
  social_competence NUMERIC,
  free_text JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- report table
CREATE TABLE report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES submission(id) ON DELETE CASCADE,
  state TEXT DEFAULT 'draft' CHECK (state IN ('draft', 'edited', 'approved', 'sent', 'failed', 'retry', 'hold')),
  note TEXT,
  what_you_shared TEXT,
  action_plan TEXT,
  pdf_url TEXT,
  share_link_token TEXT UNIQUE,
  share_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- delivery table
CREATE TABLE delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES report(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  evolution_message_id TEXT,
  attempt INTEGER DEFAULT 0,
  error TEXT,
  sent_at TIMESTAMPTZ
);

-- session table (Track 2)
CREATE TABLE session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  duration_days INTEGER,
  start_date DATE,
  end_date DATE,
  question_version_id UUID REFERENCES question_version(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- session_member table (Track 2)
CREATE TABLE session_member (
  session_id UUID NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'enrolled',
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (session_id, member_id)
);

-- audit table
CREATE TABLE audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT,
  entity TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  diff JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE member ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission ENABLE ROW LEVEL SECURITY;
ALTER TABLE report ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE session ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies: member (service_role only, no anon access)
CREATE POLICY "member_no_select" ON member FOR SELECT USING (false);
CREATE POLICY "member_no_insert" ON member FOR INSERT WITH CHECK (false);
CREATE POLICY "member_no_update" ON member FOR UPDATE USING (false);
CREATE POLICY "member_no_delete" ON member FOR DELETE USING (false);

-- RLS Policies: question_version (anon can read published, service_role full)
CREATE POLICY "question_version_anon_read_published" ON question_version
  FOR SELECT USING (status = 'published');
CREATE POLICY "question_version_no_insert_anon" ON question_version
  FOR INSERT WITH CHECK (false);
CREATE POLICY "question_version_no_update_anon" ON question_version
  FOR UPDATE USING (false);
CREATE POLICY "question_version_no_delete_anon" ON question_version
  FOR DELETE USING (false);

-- RLS Policies: submission (anon can insert, service_role full)
CREATE POLICY "submission_anon_insert" ON submission
  FOR INSERT WITH CHECK (true);
CREATE POLICY "submission_no_select_anon" ON submission
  FOR SELECT USING (false);
CREATE POLICY "submission_no_update_anon" ON submission
  FOR UPDATE USING (false);
CREATE POLICY "submission_no_delete_anon" ON submission
  FOR DELETE USING (false);

-- RLS Policies: report (service_role only)
CREATE POLICY "report_no_select" ON report FOR SELECT USING (false);
CREATE POLICY "report_no_insert" ON report FOR INSERT WITH CHECK (false);
CREATE POLICY "report_no_update" ON report FOR UPDATE USING (false);
CREATE POLICY "report_no_delete" ON report FOR DELETE USING (false);

-- RLS Policies: delivery (service_role only)
CREATE POLICY "delivery_no_select" ON delivery FOR SELECT USING (false);
CREATE POLICY "delivery_no_insert" ON delivery FOR INSERT WITH CHECK (false);
CREATE POLICY "delivery_no_update" ON delivery FOR UPDATE USING (false);
CREATE POLICY "delivery_no_delete" ON delivery FOR DELETE USING (false);

-- RLS Policies: session (service_role only)
CREATE POLICY "session_no_select" ON session FOR SELECT USING (false);
CREATE POLICY "session_no_insert" ON session FOR INSERT WITH CHECK (false);
CREATE POLICY "session_no_update" ON session FOR UPDATE USING (false);
CREATE POLICY "session_no_delete" ON session FOR DELETE USING (false);

-- RLS Policies: session_member (service_role only)
CREATE POLICY "session_member_no_select" ON session_member FOR SELECT USING (false);
CREATE POLICY "session_member_no_insert" ON session_member FOR INSERT WITH CHECK (false);
CREATE POLICY "session_member_no_update" ON session_member FOR UPDATE USING (false);
CREATE POLICY "session_member_no_delete" ON session_member FOR DELETE USING (false);

-- RLS Policies: audit (service_role only)
CREATE POLICY "audit_no_select" ON audit FOR SELECT USING (false);
CREATE POLICY "audit_no_insert" ON audit FOR INSERT WITH CHECK (false);
CREATE POLICY "audit_no_update" ON audit FOR UPDATE USING (false);
CREATE POLICY "audit_no_delete" ON audit FOR DELETE USING (false);

-- Create indexes for performance
CREATE INDEX idx_member_phone ON member(phone);
CREATE INDEX idx_submission_member_id ON submission(member_id);
CREATE INDEX idx_submission_created_at ON submission(created_at);
CREATE INDEX idx_report_member_id ON report(member_id);
CREATE INDEX idx_report_state ON report(state);
CREATE INDEX idx_delivery_report_id ON delivery(report_id);
CREATE INDEX idx_delivery_status ON delivery(status);
CREATE INDEX idx_audit_entity ON audit(entity, entity_id);
