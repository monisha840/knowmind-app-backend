# Phase 4: Pre-Assessment Member Ingestion

This document describes the import flow for 42 pre-assessment members from the EI_EOS_scored_with_actions.xlsx file.

## Files

**Source Data:** `knowmind_frontend/src/data/EI_EOS_scored_with_actions.xlsx` (42 rows)

**Backend API:**
- POST `/api/import/preview` - Parse and show preview/diff before committing
- POST `/api/import/execute` - Execute the import

**Frontend UI:**
- `/console/import` - Upload and preview interface
- `/console/members` - View all members and cohort statistics

## Schema

The importer reads from Excel columns in this order:
1. Name (required)
2. Gender
3. Marital status
4. Business / Occupation
5. Q28 free-text response
6. Q29 free-text response
7. Q30 free-text response
8-13. Six domain mean scores:
   - Self-Awareness
   - Self-Regulation
   - Motivation
   - Empathy
   - Social & Leadership
   - Relationship Intelligence
14. Overall mean score
15+ (ignored) - Derived columns (band/level, growth area, action text)

## Deduplication

- Dedupes on **NAME** (phone is absent)
- Running import twice with same 42 rows will NOT create duplicates
- Updates are not performed; existing members are skipped during import

## Data Guarantees

- NO raw_answers (null) - only 6 pre-computed domain means
- NO phone, NO location (both NULL in schema)
- member_id is NOT required for pre-assessment submissions
- free_text stored as JSONB: `{ Q28: "...", Q29: "...", Q30: "..." }`
- personal_competence = (Self-Awareness + Self-Regulation + Motivation) / 3
- social_competence = (Empathy + Social & Leadership + Relationship Intelligence) / 3

## Migrations Required Before Running

Apply these in order:

1. `migrations/001_initial_schema.sql` (if not already applied)
2. `migrations/002_fix_anon_rls.sql` (adds explicit TO anon for RLS policies)
3. `migrations/003_allow_nullable_question_version.sql` (allows pre-assessment submissions with null question_version_id)

Apply via Supabase console SQL editor.

## Testing the Import

### Step 1: Start the backend
```bash
cd knowmind_backend
npm install
npm run dev
```

Backend should be running on http://localhost:4000

### Step 2: Start the frontend
```bash
cd knowmind_frontend
npm run dev
```

Frontend should be running on http://localhost:3000

### Step 3: Navigate to import page
- Go to http://localhost:3000/console/import
- Select `knowmind_frontend/src/data/EI_EOS_scored_with_actions.xlsx`
- Click "Preview" to see the diff
  - Should show: 42 total, 42 new, 0 updates, 0 duplicates
  - No parsing errors
- Click "Commit Import" to execute

### Step 4: Verify members
- Navigate to http://localhost:3000/console/members
- Should show exactly 42 members with names and businesses
- Should show cohort statistics:
  - **Cohort Average** (overall mean of all 42 scores)
  - **Weakest Domain** (lowest average domain score)
  - **Total Members** (42)

## Logging

On successful import, the backend logs:
```
Created 42 new members
Cohort average: X.XX
Weakest domain: [domain name]
Domain averages:
  Self-Awareness: X.XX
  Self-Regulation: X.XX
  ... (all 6 domains)
```

## Troubleshooting

### "No file uploaded"
- File upload failed; try again

### "No valid rows could be parsed"
- Check Excel headers match expected column order
- Check for blank rows or invalid data types
- Review error list in preview (shows row number and specific error)

### "No published question version found" during submit
- Pre-assessment imports don't reference question_version; this is normal
- question_version_id is NULL for all imported submissions

### Duplicate names on re-run
- This shouldn't happen; dedup logic checks existing member names
- If duplicates appear, check database didn't get partial import

## Next Steps (Phase 5)

After Gate 0 verification with exactly 42 members:
- Send baseline assessments to the cohort
- Track mid-assessment and post-assessment submissions
- Generate EI reports
- Track delivery status

---

**Created:** 2026-06-29
**Backend:** knowmind_backend/src/lib/importMembers.ts, src/index.ts
**Frontend:** knowmind_frontend/src/app/console/import/page.tsx, src/app/console/members/page.tsx
