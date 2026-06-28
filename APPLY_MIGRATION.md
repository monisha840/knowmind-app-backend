# Phase 1 Migration Application

The database schema migration is version-controlled in `migrations/001_initial_schema.sql`.

## How to Apply

### Option 1: Supabase Web Console (Recommended)
1. Go to https://app.supabase.com
2. Select your KnowMind project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the entire contents of `migrations/001_initial_schema.sql`
6. Paste into the query editor
7. Click **Run**

Wait for success message (should complete in ~2 seconds).

### Option 2: Supabase CLI
```bash
supabase db push
```
(Requires Supabase CLI installed and project linked)

### Verification
After applying the migration, verify in Supabase console:
1. Go to **Table Editor**
2. You should see 8 tables:
   - member
   - question_version
   - submission
   - report
   - delivery
   - session
   - session_member
   - audit

3. All tables should have RLS enabled (check **Auth > Policies**)

## Schema Overview

| Table | Purpose | RLS |
|---|---|---|
| member | Member profiles | Service role only |
| question_version | Question sets (versioned) | Public read, service role write |
| submission | Raw and scored responses | Anon insert, service role read |
| report | Generated EI reports | Service role only |
| delivery | WhatsApp delivery status | Service role only |
| session | Session cohorts (Track 2) | Service role only |
| session_member | Session enrollments (Track 2) | Service role only |
| audit | Audit log | Service role only |

## Next Steps
Once the migration is applied, run the backend and it can store submissions to the database.
