│
◇  Downloading snippet...
-- ============================================================
-- QUERY 87
-- get_trainer_learner_activity
--
-- Returns a chronological activity timeline for one learner
-- inside one onboarding program.
--
-- Includes:
-- - module completions
-- - quiz submissions / results
-- - checkpoint submissions / results
-- ============================================================

drop function if exists public.get_trainer_learner_activity(uuid, uuid);

create function public.get_trainer_learner_activity(
  target_program_id uuid,
  target_learner_id uuid
)
returns table(
  event_type text,
  event_id uuid,

  title text,
  description text,

  day_id uuid,
  day_number integer,
  day_title text,

  related_id uuid,
  score numeric,
  passed boolean,
  status text,

  occurred_at timestamptz
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
  -- VALIDATE ENROLLMENT
  -- ----------------------------------------------------------

  if not exists (
    select 1
    from public.program_enrollments pe
    where pe.program_id = target_program_id
      and pe.learner_id = target_learner_id
  ) then
    raise exception 'Learner is not enrolled in this program';
  end if;

  return query

  -- ==========================================================
  -- MODULE COMPLETIONS
  -- ==========================================================

  select
    'module_completed'::text as event_type,
    lmp.module_id as event_id,

    m.title as title,
    'Module completed'::text as description,

    d.id as day_id,
    d.day_number,
    d.title as day_title,

    m.id as related_id,

    null::numeric as score,
    null::boolean as passed,
    lmp.status as status,

    lmp.completed_at as occurred_at

  from public.learner_module_progress lmp

  join public.modules m
    on m.id = lmp.module_id

  join public.days d
    on d.id = m.day_id

  where lmp.learner_id = target_learner_id
    and d.program_id = target_program_id
    and lmp.status = 'completed'
    and lmp.completed_at is not null

  union all

  -- ==========================================================
  -- NORMAL QUIZ SUBMISSIONS / RESULTS
  -- ==========================================================

  select
    case
      when qa.status = 'needs_review'
        then 'quiz_submitted'

      when qa.status = 'graded'
        and qa.passed = true
        then 'quiz_passed'

      when qa.status = 'graded'
        and qa.passed = false
        then 'quiz_not_passed'

      else 'quiz_activity'
    end::text as event_type,

    qa.id as event_id,

    q.title as title,

    case
      when qa.status = 'needs_review'
        then 'Quiz submitted · Pending review'

      when qa.status = 'graded'
        and qa.passed = true
        then 'Quiz passed'

      when qa.status = 'graded'
        and qa.passed = false
        then 'Quiz not passed'

      else 'Quiz activity'
    end::text as description,

    d.id as day_id,
    d.day_number,
    d.title as day_title,

    q.id as related_id,

    qa.score,
    qa.passed,
    qa.status,

    coalesce(
      qa.graded_at,
      qa.submitted_at,
      qa.started_at
    ) as occurred_at

  from public.quiz_attempts qa

  join public.quizzes q
    on q.id = qa.quiz_id

  join public.modules m
    on m.id = q.module_id

  join public.days d
    on d.id = m.day_id

  where qa.learner_id = target_learner_id
    and d.program_id = target_program_id

    -- Checkpoint quizzes are represented below through
    -- checkpoint_results, so they must not be duplicated here.
    and not exists (
      select 1
      from public.checkpoints c
      where c.quiz_id = q.id
    )

  union all

  -- ==========================================================
  -- CHECKPOINT RESULTS
  -- ==========================================================

  select
    case
      when cr.status = 'submitted'
        then 'checkpoint_submitted'

      when cr.status = 'needs_review'
        then 'checkpoint_submitted'

      when cr.status = 'graded'
        and cr.passed = true
        then 'checkpoint_passed'

      when cr.status = 'graded'
        and cr.passed = false
        then 'checkpoint_not_passed'

      else 'checkpoint_activity'
    end::text as event_type,

    cr.id as event_id,

    c.title as title,

    case
      when cr.status = 'submitted'
        then 'Checkpoint submitted'

      when cr.status = 'needs_review'
        then 'Checkpoint submitted · Pending review'

      when cr.status = 'graded'
        and cr.passed = true
        then 'Checkpoint passed'

      when cr.status = 'graded'
        and cr.passed = false
        then 'Checkpoint not passed'

      else 'Checkpoint activity'
    end::text as description,

    d.id as day_id,
    d.day_number,
    d.title as day_title,

    c.id as related_id,

    cr.score,
    cr.passed,
    cr.status,

    coalesce(
      cr.graded_at,
      cr.submitted_at
    ) as occurred_at

  from public.checkpoint_results cr

  join public.checkpoints c
    on c.id = cr.checkpoint_id

  join public.days d
    on d.id = c.day_id

  where cr.learner_id = target_learner_id
    and d.program_id = target_program_id

  -- ==========================================================
  -- NEWEST FIRST
  -- ==========================================================

  order by occurred_at desc nulls last;

end;
$function$;
