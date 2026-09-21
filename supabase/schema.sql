-- StudentOS cloud storage
-- Run this in Supabase SQL Editor after creating a Supabase project.

create table if not exists public.studentos_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default jsonb_build_object(
    'tasks', '[]'::jsonb,
    'exams', '[]'::jsonb,
    'scores', '[]'::jsonb,
    'journey', 'Finish Class 10 strong'
  ),
  updated_at timestamptz not null default now()
);

alter table public.studentos_profiles enable row level security;

drop policy if exists "Users can read their own StudentOS data" on public.studentos_profiles;
create policy "Users can read their own StudentOS data"
  on public.studentos_profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert their own StudentOS data" on public.studentos_profiles;
create policy "Users can insert their own StudentOS data"
  on public.studentos_profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own StudentOS data" on public.studentos_profiles;
create policy "Users can update their own StudentOS data"
  on public.studentos_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
