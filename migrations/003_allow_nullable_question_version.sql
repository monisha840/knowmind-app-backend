-- Allow null question_version_id for pre-assessment submissions
ALTER TABLE submission
ALTER COLUMN question_version_id DROP NOT NULL;
