│
◇  Downloading snippet...
-- =========================================================
-- HELLOGOV ONBOARDING
-- Base Schema v1
-- Users + Program Content
-- =========================================================


-- =========================================================
-- 1. PROFILES
-- Extends Supabase Auth users
-- =========================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'learner'
    check (role in ('learner', 'trainer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =========================================================
-- 2. PROGRAMS
-- Main onboarding program
-- =========================================================

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =========================================================
-- 3. SETUP CHECKLIST
-- Editable items shown before/during onboarding
-- =========================================================

create table public.setup_items (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null
    references public.programs(id) on delete cascade,
  title text not null,
  description text,
  position integer not null default 0,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =========================================================
-- 4. DAYS
-- Day 1, Day 2, Day 3...
-- =========================================================

create table public.days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null
    references public.programs(id) on delete cascade,
  day_number integer not null,
  title text not null,
  description text,
  position integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(program_id, day_number)
);


-- =========================================================
-- 5. MODULES
-- Training topics within each day
-- =========================================================

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null
    references public.days(id) on delete cascade,
  title text not null,
  description text,
  duration_minutes integer,
  position integer not null default 0,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =========================================================
-- 6. MATERIALS
-- Links/resources attached to modules
-- =========================================================

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null
    references public.modules(id) on delete cascade,
  title text not null,
  description text,
  material_type text not null default 'link'
    check (
      material_type in (
        'link',
        'video',
        'document',
        'presentation',
        'reading',
        'other'
      )
    ),
  url text,
  is_required boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =========================================================
-- 7. ACTIVITIES
-- Roleplays, mock calls, cases, practice, etc.
-- =========================================================

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null
    references public.modules(id) on delete cascade,
  title text not null,
  description text,
  instructions text,
  activity_type text not null default 'practice',
  duration_minutes integer,
  is_required boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =========================================================
-- 8. QUIZZES
-- A module may have one or more quizzes
-- =========================================================

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  module_id uuid
    references public.modules(id) on delete cascade,
  title text not null,
  description text,
  passing_score numeric(5,2) not null default 80,
  max_attempts integer default 1,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =========================================================
-- 9. QUIZ QUESTIONS
-- =========================================================

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null
    references public.quizzes(id) on delete cascade,
  question_text text not null,
  question_type text not null default 'single_choice'
    check (
      question_type in (
        'single_choice',
        'multiple_choice',
        'true_false',
        'open_text'
      )
    ),
  points numeric(8,2) not null default 1,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =========================================================
-- 10. QUIZ OPTIONS
-- Answers for choice-based questions
-- =========================================================

create table public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null
    references public.quiz_questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);


-- =========================================================
-- 11. CHECKPOINTS
-- Mid-day/end-of-day evaluations
-- =========================================================

create table public.checkpoints (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null
    references public.days(id) on delete cascade,
  title text not null,
  description text,
  checkpoint_type text not null default 'knowledge'
    check (
      checkpoint_type in (
        'knowledge',
        'practical',
        'mock_call',
        'trainer_review',
        'other'
      )
    ),
  passing_score numeric(5,2),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =========================================================
-- 12. CERTIFICATION
-- Editable final certification section
-- =========================================================

create table public.certifications (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null unique
    references public.programs(id) on delete cascade,
  title text not null,
  description text,
  passing_score numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table public.certification_components (
  id uuid primary key default gen_random_uuid(),
  certification_id uuid not null
    references public.certifications(id) on delete cascade,
  title text not null,
  description text,
  component_type text not null default 'assessment',
  passing_score numeric(5,2),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =========================================================
-- 13. POST-TRAINING
-- Nesting / supported production
-- =========================================================

create table public.post_training (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null unique
    references public.programs(id) on delete cascade,
  title text not null,
  description text,
  disclaimer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table public.post_training_stages (
  id uuid primary key default gen_random_uuid(),
  post_training_id uuid not null
    references public.post_training(id) on delete cascade,
  title text not null,
  description text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
