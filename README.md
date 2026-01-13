# Emirates Group Roblox — Careers Site (v3)

This package contains:
- Static website (GitHub Pages / any static host)
- Supabase SQL schema + RLS policies
- Supabase Edge Functions for HR-only management

## 1) Deploy the database
Open Supabase → SQL Editor → run:
- `supabase/sql/schema.sql`

Then confirm tables exist:
- `public.jobs`
- `public.applications`

## 2) Deploy Edge Functions (HR endpoints)
In Supabase → Edge Functions:
- Create `hr-jobs` and paste `supabase/functions/hr-jobs/index.ts`
- Create `hr-applications` and paste `supabase/functions/hr-applications/index.ts`
Deploy both.

### Required Function Secrets / Env Vars
Set these in Supabase project settings (Edge Functions → Secrets):
- `SUPABASE_URL` = your project URL
- `SUPABASE_SERVICE_ROLE_KEY` = service role key (KEEP PRIVATE)
- `HR_PASSWORD` = your HR dashboard password

Optional:
- `DISCORD_WEBHOOK_URL` = Discord webhook to notify accept/reject decisions
- `ALLOWED_ORIGINS` = comma-separated allowed site origins (e.g., https://careers.example.com)

## 3) Host the website
Upload the website files (everything in the root of this folder) to your static host.

Ensure paths are root-based (e.g. `/assets/...`), so host at domain root.

## 4) Configure website Supabase keys
Edit:
- `assets/js/config.js`

You should ONLY use the anon key in the frontend. Never expose your service role key publicly.

## 5) Test (Public)
- Open `/jobs.html` → you should see seeded jobs.
- Open `/apply.html?id=<job_id>` → submit application.
- Verify in Supabase Table Editor: applications inserted with `status=pending`.

## 6) Test (HR)
- Open `/hr/login.html` → enter HR password → dashboard loads.
- Add/edit/pause jobs.
- Accept/reject applications.

## Common failure causes
1. RLS not enabled / policies not applied (jobs not visible, applications cannot insert)
2. Edge functions missing env vars (HR dashboard fails to load)
3. Wrong `FUNCTIONS_BASE` (should be `https://<project>.supabase.co/functions/v1`)
4. Browser console shows 401/500 from edge functions (password mismatch or missing service role key)