│
◇  Downloading snippet...
-- ============================================================
-- QUERY 80
-- get_trainer_learner_activity
--
-- Trainer-facing activity timeline for one learner
-- in one program.
--
-- Combines relevant learner events into one chronological feed:
-- - setup completion
-- - module progress
-- - quiz attempts
-- - checkpoint results
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
  subtitle text,
  status text,
  score numeric,
  passed boolean,
  occurred_at timestamptz,
  day_number integer,
  day_title text
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
  -- ACTIVITY TIMELINE
  -- ----------------------------------------------------------

  return query

  -- ==========================================================
  -- SETUP COMPLETIONS
  -- ==========================================================

  select
    'setup'::text as event_type,
    si.id as event_id,
    si.title as title,
    'Setup item completed'::text as subtitle,
    'completed'::text as status,
    null::numeric as score,
    null::boolean as passed,
    lsp.completed_at as occurred_at,
    null::integer as day_number,
    null::text as day_title

  from public.learner_setup_progress lsp

  join public.setup_items si
    on si.id = lsp.setup_item_id

  where lsp.learner_id = target_learner_id
    and si.program_id = target_program_id
    and lsp.completed = true
    and lsp.completed_at is not null

  union all

  -- ==========================================================
  -- MODULE START / COMPLETION
  -- ==========================================================

  select
    'module'::text as event_type,
    m.id as event_id,
    m.title as title,

    case
      when lmp.status = 'completed'
        then 'Module completed'
      else 'Module started'
    end::text as subtitle,

    lmp.status as status,

    null::numeric as score,
    null::boolean as passed,

    case
      when lmp.status = 'completed'
        then lmp.completed_at
      else lmp.started_at
    end as occurred_at,

    d.day_number,
    d.title as day_title

  from public.learner_module_progress lmp

  join public.modules m
    on m.id = lmp.module_id

  join public.days d
    on d.id = m.day_id

  where lmp.learner_id = target_learner_id
    and d.program_id = target_program_id
    and d.is_published = true
    and (
      lmp.completed_at is not null
      or lmp.started_at is not null
    )

  union all

  -- ==========================================================
  -- NORMAL QUIZ ATTEMPTS
  --
  -- Checkpoint quizzes excluded.
  -- ==========================================================

  select
    'quiz'::text as event_type,
    qa.id as event_id,
    q.title as title,

    (
      'Quiz attempt '
      || qa.attempt_number::text
    )::text as subtitle,

    qa.status as status,
    qa.score,
    qa.passed,

    coalesce(
      qa.graded_at,
      qa.submitted_at,
      qa.started_at
    ) as occurred_at,

    d.day_number,
    d.title as day_title

  from public.quiz_attempts qa

  join public.quizzes q
    on q.id = qa.quiz_id

  join public.modules m
    on m.id = q.module_id

  join public.days d
    on d.id = m.day_id

  where qa.learner_id = target_learner_id
    and d.program_id = target_program_id
    and d.is_published = true

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
    'checkpoint'::text as event_type,
    cr.id as event_id,
    c.title as title,

    (
      'Checkpoint · '
      || replace(
        c.checkpoint_type,
        '_',
        ' '
      )
    )::text as subtitle,

    cr.status as status,
    cr.score,
    cr.passed,

    coalesce(
      cr.graded_at,
      cr.submitted_at
    ) as occurred_at,

    d.day_number,
    d.title as day_title

  from public.checkpoint_results cr

  join public.checkpoints c
    on c.id = cr.checkpoint_id

  join public.days d
    on d.id = c.day_id

  where cr.learner_id = target_learner_id
    and d.program_id = target_program_id
    and d.is_published = true

  -- ==========================================================
  -- ORDER
  -- ==========================================================

  order by occurred_at desc nulls last;

end;
$function$;
