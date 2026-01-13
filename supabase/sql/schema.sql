-- EGR Careers schema (Postgres / Supabase)
-- Run in Supabase SQL Editor.

-- Extensions (uuid generation)
create extension if not exists "pgcrypto";

-- Jobs table (public read for open jobs)
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  department text not null,
  location text not null default 'Online',
  employment_type text not null default 'Direct Entry',
  description text,
  responsibilities text,
  requirements text,
  status text not null default 'open' check (status in ('open','paused','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Applications table (public insert only; HR reads via service role in Edge Function)
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  role_title text not null,
  full_name text not null,
  discord_username text not null,
  discord_id text not null,
  roblox_username text not null,
  resume_link text,
  motivation text not null,
  why_chosen text not null,
  past_experience text not null,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Update timestamp trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_jobs_updated_at on public.jobs;
create trigger trg_jobs_updated_at before update on public.jobs
for each row execute function public.set_updated_at();

drop trigger if exists trg_apps_updated_at on public.applications;
create trigger trg_apps_updated_at before update on public.applications
for each row execute function public.set_updated_at();

-- Enable RLS
alter table public.jobs enable row level security;
alter table public.applications enable row level security;

-- Policies
-- 1) Public can read ONLY open jobs
drop policy if exists "public_read_open_jobs" on public.jobs;
create policy "public_read_open_jobs"
on public.jobs for select
to anon, authenticated
using (status = 'open');

-- 2) Public cannot insert/update/delete jobs (HR uses service role in Edge Function)
drop policy if exists "no_public_write_jobs" on public.jobs;
create policy "no_public_write_jobs"
on public.jobs for all
to anon, authenticated
using (false) with check (false);

-- 3) Public can submit applications (insert) for open jobs only
drop policy if exists "public_submit_application" on public.applications;
create policy "public_submit_application"
on public.applications for insert
to anon, authenticated
with check (
  status = 'pending'
  and exists (select 1 from public.jobs j where j.id = applications.job_id and j.status = 'open')
);

-- 4) Public cannot read applications
drop policy if exists "no_public_read_applications" on public.applications;
create policy "no_public_read_applications"
on public.applications for select
to anon, authenticated
using (false);

-- 5) Public cannot update/delete applications
drop policy if exists "no_public_write_applications" on public.applications;
create policy "no_public_write_applications"
on public.applications for update, delete
to anon, authenticated
using (false) with check (false);

-- Optional seed data (remove if not needed)
insert into public.jobs (title, department, location, employment_type, description, responsibilities, requirements, status)
select
  'Captain (Direct Entry)',
  'Flight Operations',
  'Online (PTFS)',
  'Direct Entry',
  'Operate scheduled flights with professional SOP adherence and leadership.',
  'Operate flights with SOP\nCoordinate with cabin crew\nComply with ATC and safety standards',
  'PTFS flight experience\nProfessional communication\nTeam leadership',
  'open'
where not exists (select 1 from public.jobs where title = 'Captain (Direct Entry)');

insert into public.jobs (title, department, location, employment_type, description, responsibilities, requirements, status)
select
  'Airport Staff (Direct Entry)',
  'Airport Services',
  'Online (PTFS)',
  'Direct Entry',
  'Support passenger handling and gate operations with professional standards.',
  'Check-in processing\nGate coordination\nCustomer service',
  'Professional communication\nReliability\nAbility to follow procedures',
  'open'
where not exists (select 1 from public.jobs where title = 'Airport Staff (Direct Entry)');