│
◇  Downloading snippet...
-- ============================================================
-- QUERY 82
-- get_trainer_learner_day_progress
--
-- Trainer-facing day-level progress for one learner
-- in one program.
--
-- Day progress denominator:
-- - required modules
-- - required checkpoints
--
-- Quizzes are reported for visibility but are not counted
-- separately in progress_percent because required module quizzes
-- already affect module completion.
-- ============================================================

drop function if exists public.get_trainer_learner_day_progress(uuid, uuid);

create function public.get_trainer_learner_day_progress(
  target_program_id uuid,
  target_learner_id uuid
)
returns table(
  day_id uuid,
  day_number integer,
  day_title text,
  day_position integer,

  day_status text,
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

  -- ----------------------------------------------------------
  -- DAY PROGRESS
  -- ----------------------------------------------------------

  return query

  with day_stats as (

    select
      d.id,
      d.day_number,
      d.title,
      d.position,

      -- ------------------------------------------------------
      -- MODULES
      -- ------------------------------------------------------

      (
        select count(*)
        from public.modules m
        where m.day_id = d.id
          and m.is_required = true
      ) as total_modules,

      (
        select count(*)
        from public.modules m
        join public.learner_module_progress lmp
          on lmp.module_id = m.id
        where m.day_id = d.id
          and m.is_required = true
          and lmp.learner_id = target_learner_id
          and lmp.status = 'completed'
      ) as completed_modules,

      -- ------------------------------------------------------
      -- MODULE QUIZZES
      --
      -- Checkpoint quizzes excluded.
      -- ------------------------------------------------------

      (
        select count(*)
        from public.quizzes q
        join public.modules m
          on m.id = q.module_id
        where m.day_id = d.id
          and q.is_required = true
          and q.is_published = true
          and not exists (
            select 1
            from public.checkpoints c
            where c.quiz_id = q.id
          )
      ) as total_quizzes,

      (
        select count(*)
        from public.quizzes q
        join public.modules m
          on m.id = q.module_id
        where m.day_id = d.id
          and q.is_required = true
          and q.is_published = true
          and not exists (
            select 1
            from public.checkpoints c
            where c.quiz_id = q.id
          )
          and exists (
            select 1
            from public.quiz_attempts qa
            where qa.quiz_id = q.id
              and qa.learner_id = target_learner_id
              and qa.status = 'graded'
              and qa.passed = true
          )
      ) as passed_quizzes,

      -- ------------------------------------------------------
      -- CHECKPOINTS
      -- ------------------------------------------------------

      (
        select count(*)
        from public.checkpoints c
        where c.day_id = d.id
          and c.is_required = true
      ) as total_checkpoints,

      (
        select count(*)
        from public.checkpoints c
        where c.day_id = d.id
          and c.is_required = true
          and exists (
            select 1
            from public.checkpoint_results cr
            where cr.checkpoint_id = c.id
              and cr.learner_id = target_learner_id
              and cr.status = 'graded'
              and cr.passed = true
          )
      ) as completed_checkpoints,

      -- ------------------------------------------------------
      -- PENDING MANUAL REVIEWS
      --
      -- Includes normal quiz + checkpoint quiz attempts
      -- belonging to this day.
      -- ------------------------------------------------------

      (
        select count(*)
        from public.quiz_attempts qa
        join public.quizzes q
          on q.id = qa.quiz_id
        where qa.learner_id = target_learner_id
          and qa.status = 'needs_review'
          and (
            exists (
              select 1
              from public.modules m
              where m.id = q.module_id
                and m.day_id = d.id
            )
            or
            exists (
              select 1
              from public.checkpoints c
              where c.quiz_id = q.id
                and c.day_id = d.id
            )
          )
      ) as needs_review

    from public.days d

    where d.program_id = target_program_id
      and d.is_published = true
  )

  select
    ds.id as day_id,
    ds.day_number,
    ds.title as day_title,
    ds.position as day_position,

    -- --------------------------------------------------------
    -- DAY STATUS
    -- --------------------------------------------------------

    case

      when (
        ds.total_modules +
        ds.total_checkpoints
      ) = 0
      then 'not_started'

      when
        ds.completed_modules >= ds.total_modules
        and
        ds.completed_checkpoints >= ds.total_checkpoints
      then 'completed'

      when
        ds.completed_modules > 0
        or ds.completed_checkpoints > 0
        or ds.passed_quizzes > 0
        or ds.needs_review > 0
      then 'in_progress'

      else 'not_started'

    end::text as day_status,

    -- --------------------------------------------------------
    -- DAY PROGRESS %
    -- --------------------------------------------------------

    case

      when (
        ds.total_modules +
        ds.total_checkpoints
      ) = 0
      then 0::numeric

      else round(
        (
          ds.completed_modules +
          ds.completed_checkpoints
        )::numeric
        /
        (
          ds.total_modules +
          ds.total_checkpoints
        )::numeric
        * 100,
        2
      )

    end as progress_percent,

    ds.completed_modules,
    ds.total_modules,

    ds.passed_quizzes,
    ds.total_quizzes,

    ds.completed_checkpoints,
    ds.total_checkpoints,

    ds.needs_review

  from day_stats ds

  order by
    ds.position,
    ds.day_number;

end;
$function$;
