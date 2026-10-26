│
◇  Downloading snippet...
-- ============================================================
-- QUERY 77
-- get_trainer_learner_checkpoint_progress
--
-- Trainer-facing checkpoint progress for one learner
-- in one program.
-- Returns one row per checkpoint.
-- ============================================================

drop function if exists public.get_trainer_learner_checkpoint_progress(uuid, uuid);

create function public.get_trainer_learner_checkpoint_progress(
  target_program_id uuid,
  target_learner_id uuid
)
returns table(
  day_id uuid,
  day_number integer,
  day_title text,
  day_position integer,

  checkpoint_id uuid,
  checkpoint_title text,
  checkpoint_description text,
  checkpoint_type text,
  checkpoint_position integer,
  is_required boolean,
  passing_score numeric,

  quiz_id uuid,

  checkpoint_status text,
  score numeric,
  passed boolean,
  submitted_at timestamptz,
  graded_at timestamptz,
  trainer_feedback text,

  quiz_attempt_id uuid,
  quiz_attempt_status text,
  quiz_attempt_number integer,
  needs_review boolean
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
  -- VALIDATE LEARNER ENROLLMENT
  -- ----------------------------------------------------------

  if not exists (
    select 1
    from public.program_enrollments pe
    where pe.program_id = target_program_id
      and pe.learner_id = target_learner_id
  ) then
    raise exception 'Learner is not enrolled in this program';
  end if;

  -- ----------------------------------------------------------
  -- CHECKPOINT PROGRESS
  -- ----------------------------------------------------------

  return query
  select
    d.id as day_id,
    d.day_number,
    d.title as day_title,
    d.position as day_position,

    c.id as checkpoint_id,
    c.title as checkpoint_title,
    c.description as checkpoint_description,
    c.checkpoint_type,
    c.position as checkpoint_position,
    c.is_required,
    c.passing_score,

    c.quiz_id,

    -- --------------------------------------------------------
    -- CHECKPOINT RESULT
    -- --------------------------------------------------------

    coalesce(
      cr.status,
      case
        when qa.id is not null
          and qa.status = 'needs_review'
          then 'needs_review'

        when qa.id is not null
          and qa.status = 'in_progress'
          then 'in_progress'

        else 'not_started'
      end
    ) as checkpoint_status,

    cr.score,
    cr.passed,
    cr.submitted_at,
    cr.graded_at,
    cr.trainer_feedback,

    -- --------------------------------------------------------
    -- LINKED QUIZ ATTEMPT
    --
    -- LATERAL query returns the most recent attempt for the
    -- checkpoint's linked quiz.
    -- --------------------------------------------------------

    qa.id as quiz_attempt_id,
    qa.status as quiz_attempt_status,
    qa.attempt_number as quiz_attempt_number,

    (
      qa.status = 'needs_review'
    ) as needs_review

  from public.checkpoints c

  join public.days d
    on d.id = c.day_id

  -- ----------------------------------------------------------
  -- LEARNER CHECKPOINT RESULT
  -- ----------------------------------------------------------

  left join public.checkpoint_results cr
    on cr.checkpoint_id = c.id
    and cr.learner_id = target_learner_id

  -- ----------------------------------------------------------
  -- MOST RECENT LINKED QUIZ ATTEMPT
  -- ----------------------------------------------------------

  left join lateral (
    select
      qat.id,
      qat.status,
      qat.attempt_number,
      qat.started_at,
      qat.submitted_at,
      qat.graded_at
    from public.quiz_attempts qat
    where qat.quiz_id = c.quiz_id
      and qat.learner_id = target_learner_id
    order by
      qat.attempt_number desc,
      qat.started_at desc
    limit 1
  ) qa
    on true

  where d.program_id = target_program_id
    and d.is_published = true

  order by
    d.position,
    d.day_number,
    c.position,
    c.title;

end;
$function$;
