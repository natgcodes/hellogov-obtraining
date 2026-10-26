│
◇  Downloading snippet...
-- ============================================================
-- QUERY 85
-- get_trainer_learner_summary
--
-- Returns the high-level trainer summary for one learner
-- inside one onboarding program.
--
-- Used by:
-- /trainer/learners/[learnerId]
-- ============================================================

drop function if exists public.get_trainer_learner_summary(uuid, uuid);

create function public.get_trainer_learner_summary(
  target_program_id uuid,
  target_learner_id uuid
)
returns table(
  learner_id uuid,
  full_name text,
  email text,

  enrollment_status text,
  enrolled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,

  progress_percent numeric,

  completed_modules bigint,
  total_modules bigint,

  passed_quizzes bigint,
  total_quizzes bigint,

  completed_checkpoints bigint,
  total_checkpoints bigint,

  needs_review bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin

  -- ----------------------------------------------------------
  -- SECURITY
  -- ----------------------------------------------------------

  if not public.is_trainer() then
    raise exception 'Trainer access required';
  end if;

  -- ----------------------------------------------------------
  -- LEARNER SUMMARY
  --
  -- Reuses get_trainer_learners so the learner profile and
  -- roster always use the exact same progress calculations.
  -- ----------------------------------------------------------

  return query

  select
    tl.learner_id,
    tl.full_name,
    tl.email,

    tl.enrollment_status,
    tl.enrolled_at,
    tl.started_at,
    tl.completed_at,

    tl.progress_percent,

    tl.completed_modules,
    tl.total_modules,

    tl.passed_quizzes,
    tl.total_quizzes,

    tl.completed_checkpoints,
    tl.total_checkpoints,

    tl.needs_review

  from public.get_trainer_learners(
    target_program_id
  ) tl

  where tl.learner_id = target_learner_id;

end;
$function$;
