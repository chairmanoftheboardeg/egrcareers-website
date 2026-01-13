EGR Careers Site (careers.emiratesgrouproblox.link)

This ZIP includes:
- Full public Careers website (Home, Jobs, Role details, Apply, Departments, Hiring Process, HR Team, Legal)
- HR Portal (password login + dashboard) that manages jobs + applications
- Supabase SQL schema and RLS policies
- Supabase Edge Functions (HR APIs + Discord onboarding)

IMPORTANT: A fully static site cannot securely protect HR database access by itself.
To keep HR private WITHOUT Supabase Auth, this build uses:
- Public pages: Supabase anon key (safe) to read OPEN jobs + submit applications only
- HR pages: call Supabase Edge Functions that require a shared HR password (server-side check)
- HR Edge Functions use SERVICE ROLE key stored only in Supabase env vars

Setup steps (required)
1) Supabase SQL
- Run: /supabase/sql/schema.sql

2) Edge Functions (in Supabase Function Editor)
- Create: hr-jobs (paste /supabase/functions/hr-jobs/index.ts)
- Create: hr-applications (paste /supabase/functions/hr-applications/index.ts)
- Also include helper: /supabase/functions/_shared.ts (inline it if your editor doesn’t support shared imports)

3) Supabase environment variables (Dashboard → Settings → Environment Variables)
Required:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- HR_DASH_PASSWORD

Discord onboarding (optional, only if you want automatic role + DM):
- DISCORD_BOT_TOKEN
- DISCORD_GUILD_ID
- DISCORD_STAFF_ROLE_ID
- ONBOARDING_PDF_URL

4) Frontend config
- Edit: /assets/js/config.js
- Set:
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
  - FUNCTIONS_BASE  (https://<project-ref>.supabase.co/functions/v1)

Logo paths
- This ZIP includes /image/logo.png AND /images/logo.png.
Replace them with your real logo.