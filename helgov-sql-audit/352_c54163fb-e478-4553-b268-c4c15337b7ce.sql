│
◇  Downloading snippet...
-- =========================================================
-- HELLOGOV ONBOARDING
-- Learner Progress & Assessments v1
-- =========================================================


-- =========================================================
-- 1. PROGRAM ENROLLMENTS
-- Which learners belong to which onboarding program
-- =========================================================

create table public.program_enrollments (
  id uuid primary key default gen_random_uuid(),

  program_id uuid not null
    references public.programs(id) on delete cascade,

  learner_id uuid not null
    references public.profiles(id) on delete cascade,

  status text not null default 'not_started'
    check (
      status in (
        'not_started',
        'in_progress',
        'completed'
      )
    ),

  enrolled_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,

  unique(program_id, learner_id)
);


-- =========================================================
-- 2. SETUP PROGRESS
-- Learner completion of setup checklist items
-- =========================================================

create table public.learner_setup_progress (
  id uuid primary key default gen_random_uuid(),

  learner_id uuid not null
    references public.profiles(id) on delete cascade,

  setup_item_id uuid not null
    references public.setup_items(id) on delete cascade,

  completed boolean not null default false,
  completed_at timestamptz,

  unique(learner_id, setup_item_id)
);


-- =========================================================
-- 3. MODULE PROGRESS
-- Learner progress through training topics
-- =========================================================

create table public.learner_module_progress (
  id uuid primary key default gen_random_uuid(),

  learner_id uuid not null
    references public.profiles(id) on delete cascade,

  module_id uuid not null
    references public.modules(id) on delete cascade,

  status text not null default 'not_started'
    check (
      status in (
        'not_started',
        'in_progress',
        'completed'
      )
    ),

  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),

  unique(learner_id, module_id)
);


-- =========================================================
-- 4. MATERIAL PROGRESS
-- Tracks required resources opened/completed
-- =========================================================

create table public.learner_material_progress (
  id uuid primary key default gen_random_uuid(),

  learner_id uuid not null
    references public.profiles(id) on delete cascade,

  material_id uuid not null
    references public.materials(id) on delete cascade,

  completed boolean not null default false,
  completed_at timestamptz,

  unique(learner_id, material_id)
);


-- =========================================================
-- 5. ACTIVITY PROGRESS
-- Mock calls, roleplays, cases, practice, etc.
-- =========================================================

create table public.learner_activity_progress (
  id uuid primary key default gen_random_uuid(),

  learner_id uuid not null
    references public.profiles(id) on delete cascade,

  activity_id uuid not null
    references public.activities(id) on delete cascade,

  status text not null default 'not_started'
    check (
      status in (
        'not_started',
        'in_progress',
        'submitted',
        'completed'
      )
    ),

  learner_notes text,
  trainer_notes text,

  completed_at timestamptz,
  updated_at timestamptz not null default now(),

  unique(learner_id, activity_id)
);


-- =========================================================
-- 6. QUIZ ATTEMPTS
-- One learner may have multiple attempts if allowed
-- =========================================================

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),

  quiz_id uuid not null
    references public.quizzes(id) on delete cascade,

  learner_id uuid not null
    references public.profiles(id) on delete cascade,

  attempt_number integer not null default 1,

  score numeric(5,2),

  passed boolean,

  status text not null default 'in_progress'
    check (
      status in (
        'in_progress',
        'submitted',
        'graded'
      )
    ),

  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  graded_at timestamptz,

  unique(quiz_id, learner_id, attempt_number)
);


-- =========================================================
-- 7. QUIZ ANSWERS
-- Individual answers for every attempt
-- =========================================================

create table public.quiz_answers (
  id uuid primary key default gen_random_uuid(),

  attempt_id uuid not null
    references public.quiz_attempts(id) on delete cascade,

  question_id uuid not null
    references public.quiz_questions(id) on delete cascade,

  selected_option_id uuid
    references public.quiz_options(id) on delete set null,

  answer_text text,

  is_correct boolean,

  points_awarded numeric(8,2),

  trainer_feedback text,

  graded_at timestamptz,

  unique(attempt_id, question_id)
);


-- =========================================================
-- 8. CHECKPOINT RESULTS
-- Mid-day / end-of-day evaluation results
-- =========================================================

create table public.checkpoint_results (
  id uuid primary key default gen_random_uuid(),

  checkpoint_id uuid not null
    references public.checkpoints(id) on delete cascade,

  learner_id uuid not null
    references public.profiles(id) on delete cascade,

  score numeric(5,2),
  passed boolean,

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'completed',
        'needs_review'
      )
    ),

  trainer_notes text,

  completed_at timestamptz,
  reviewed_at timestamptz,

  unique(checkpoint_id, learner_id)
);


-- =========================================================
-- 9. CERTIFICATION RESULTS
-- Overall learner certification status
-- =========================================================

create table public.certification_results (
  id uuid primary key default gen_random_uuid(),

  certification_id uuid not null
    references public.certifications(id) on delete cascade,

  learner_id uuid not null
    references public.profiles(id) on delete cascade,

  status text not null default 'not_started'
    check (
      status in (
        'not_started',
        'in_progress',
        'passed',
        'failed'
      )
    ),

  final_score numeric(5,2),

  trainer_notes text,

  completed_at timestamptz,
  updated_at timestamptz not null default now(),

  unique(certification_id, learner_id)
);


-- =========================================================
-- 10. CERTIFICATION COMPONENT RESULTS
-- Results for each certification component
-- =========================================================

create table public.certification_component_results (
  id uuid primary key default gen_random_uuid(),

  component_id uuid not null
    references public.certification_components(id) on delete cascade,

  learner_id uuid not null
    references public.profiles(id) on delete cascade,

  score numeric(5,2),
  passed boolean,

  trainer_notes text,

  completed_at timestamptz,

  unique(component_id, learner_id)
);


-- =========================================================
-- INDEXES
-- Helps trainer dashboards/reporting stay fast
-- =========================================================

create index idx_enrollments_learner
  on public.program_enrollments(learner_id);

create index idx_enrollments_program
  on public.program_enrollments(program_id);

create index idx_module_progress_learner
  on public.learner_module_progress(learner_id);

create index idx_quiz_attempts_learner
  on public.quiz_attempts(learner_id);

create index idx_quiz_attempts_quiz
  on public.quiz_attempts(quiz_id);

create index idx_checkpoint_results_learner
  on public.checkpoint_results(learner_id);

create index idx_certification_results_learner
  on public.certification_results(learner_id);
