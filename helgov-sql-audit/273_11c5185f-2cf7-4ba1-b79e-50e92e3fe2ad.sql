│
◇  Downloading snippet...
-- ============================================================
-- QUERY 76
-- get_trainer_learner_module_progress
--
-- Trainer-facing module progress for one learner in one program.
-- Returns one row per module.
-- ============================================================

drop function if exists public.get_trainer_learner_module_progress(uuid, uuid);

create function public.get_trainer_learner_module_progress(
  target_program_id uuid,
  target_learner_id uuid
)
returns table(
  day_id uuid,
  day_number integer,
  day_title text,
  day_position integer,

  module_id uuid,
  module_title text,
  module_position integer,
  is_required boolean,

  module_status text,
  module_started_at timestamptz,
  module_completed_at timestamptz,

  completed_materials bigint,
  total_materials bigint,

  completed_activities bigint,
  total_activities bigint,

  passed_quizzes bigint,
  total_quizzes bigint
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
  -- MODULE PROGRESS
  -- ----------------------------------------------------------

  return query
  select
    d.id as day_id,
    d.day_number,
    d.title as day_title,
    d.position as day_position,

    m.id as module_id,
    m.title as module_title,
    m.position as module_position,
    m.is_required,

    coalesce(
      lmp.status,
      'not_started'
    ) as module_status,

    lmp.started_at as module_started_at,
    lmp.completed_at as module_completed_at,

    -- --------------------------------------------------------
    -- COMPLETED REQUIRED MATERIALS
    -- --------------------------------------------------------

    (
      select count(*)
      from public.materials ma
      join public.learner_material_progress lmatp
        on lmatp.material_id = ma.id
      where ma.module_id = m.id
        and ma.is_required = true
        and lmatp.learner_id = target_learner_id
        and lmatp.completed = true
    ) as completed_materials,

    -- --------------------------------------------------------
    -- TOTAL REQUIRED MATERIALS
    -- --------------------------------------------------------

    (
      select count(*)
      from public.materials ma
      where ma.module_id = m.id
        and ma.is_required = true
    ) as total_materials,

    -- --------------------------------------------------------
    -- COMPLETED REQUIRED ACTIVITIES
    -- --------------------------------------------------------

    (
      select count(*)
      from public.activities a
      join public.learner_activity_progress lap
        on lap.activity_id = a.id
      where a.module_id = m.id
        and a.is_required = true
        and lap.learner_id = target_learner_id
        and lap.status = 'completed'
    ) as completed_activities,

    -- --------------------------------------------------------
    -- TOTAL REQUIRED ACTIVITIES
    -- --------------------------------------------------------

    (
      select count(*)
      from public.activities a
      where a.module_id = m.id
        and a.is_required = true
    ) as total_activities,

    -- --------------------------------------------------------
    -- PASSED REQUIRED QUIZZES
    --
    -- Counts each quiz once even if the learner has multiple
    -- attempts.
    -- --------------------------------------------------------

    (
      select count(*)
      from public.quizzes q
      where q.module_id = m.id
        and q.is_required = true
        and q.is_published = true
        and exists (
          select 1
          from public.quiz_attempts qa
          where qa.quiz_id = q.id
            and qa.learner_id = target_learner_id
            and qa.status = 'graded'
            and qa.passed = true
        )
    ) as passed_quizzes,

    -- --------------------------------------------------------
    -- TOTAL REQUIRED QUIZZES
    -- --------------------------------------------------------

    (
      select count(*)
      from public.quizzes q
      where q.module_id = m.id
        and q.is_required = true
        and q.is_published = true
    ) as total_quizzes

  from public.modules m

  join public.days d
    on d.id = m.day_id

  left join public.learner_module_progress lmp
    on lmp.module_id = m.id
    and lmp.learner_id = target_learner_id

  where d.program_id = target_program_id
    and d.is_published = true

  order by
    d.position,
    d.day_number,
    m.position,
    m.title;

end;
$function$;
