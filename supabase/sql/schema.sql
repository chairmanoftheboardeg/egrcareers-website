create extension if not exists "pgcrypto";

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  department text not null,
  description text not null,
  responsibilities text not null,
  requirements text not null,
  employment_type text not null default 'Direct Entry',
  status text not null default 'open',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  role_title text not null,

  full_name text not null,
  discord_username text not null,
  discord_id text not null,
  roblox_username text not null,

  resume_link text,

  motivation text not null,
  why_chosen text not null,
  past_experience text not null,

  agreed_to_terms boolean not null default false,
  status text not null default 'pending',
  created_at timestamptz default now()
);

create index if not exists idx_jobs_status on public.jobs(status);
create index if not exists idx_jobs_department on public.jobs(department);
create index if not exists idx_applications_status on public.applications(status);
create index if not exists idx_applications_job on public.applications(job_id);

alter table public.jobs enable row level security;
alter table public.applications enable row level security;

drop policy if exists "public_read_open_jobs" on public.jobs;
create policy "public_read_open_jobs"
on public.jobs for select
using (status = 'open');

drop policy if exists "public_submit_application" on public.applications;
create policy "public_submit_application"
on public.applications for insert
with check (agreed_to_terms = true);