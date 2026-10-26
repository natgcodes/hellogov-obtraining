│
◇  Downloading snippet...
create table if not exists public.setup_sections (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null unique
    references public.programs(id) on delete cascade,
  title text not null default 'Tool Setup',
  description text,
  instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.setup_sections enable row level security;

drop policy if exists "Authenticated users can view setup sections"
on public.setup_sections;

create policy "Authenticated users can view setup sections"
on public.setup_sections
for select
to authenticated
using (true);

drop policy if exists "Trainers can insert setup sections"
on public.setup_sections;

create policy "Trainers can insert setup sections"
on public.setup_sections
for insert
to authenticated
with check (public.is_trainer());

drop policy if exists "Trainers can update setup sections"
on public.setup_sections;

create policy "Trainers can update setup sections"
on public.setup_sections
for update
to authenticated
using (public.is_trainer())
with check (public.is_trainer());

insert into public.setup_sections (
  program_id,
  title,
  description,
  instructions
)
values (
  '5f5a6ef1-3133-45f6-b421-0dc09ea4a6a0',
  'Tool Setup',
  'Define everything trainees need before onboarding begins.',
  null
)
on conflict (program_id) do nothing;
