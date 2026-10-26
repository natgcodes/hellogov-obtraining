│
◇  Downloading snippet...
drop function if exists public.get_trainer_learners(uuid);

create function public.get_trainer_learners(
  target_program_id uuid
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
  needs_review bigint,
  completed_checkpoints bigint,
  total_checkpoints bigint
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
  -- TRAINER LEARNER ROSTER
  -- ----------------------------------------------------------

  return query
  select
    pe.learner_id,
    pr.full_name,
    pr.email,
    pe.status,
    pe.enrolled_at,
    pe.started_at,
    pe.completed_at,

    -- --------------------------------------------------------
    -- PROGRAM PROGRESS
    --
    -- Required setup items
    -- + required modules
    -- + required checkpoints
    -- --------------------------------------------------------

    case
      when (
        (
          select count(*)
          from public.setup_items si
          where si.program_id = target_program_id
            and si.is_required = true
        )
        +
        (
          select count(*)
          from public.modules m
          join public.days d
            on d.id = m.day_id
          where d.program_id = target_program_id
            and d.is_published = true
            and m.is_required = true
        )
        +
        (
          select count(*)
          from public.checkpoints c
          join public.days d
            on d.id = c.day_id
          where d.program_id = target_program_id
            and d.is_published = true
            and c.is_required = true
        )
      ) = 0
      then 0::numeric

      else round(
        (
          (
            select count(*)
            from public.learner_setup_progress lsp
            join public.setup_items si
              on si.id = lsp.setup_item_id
            where lsp.learner_id = pe.learner_id
              and si.program_id = target_program_id
              and si.is_required = true
              and lsp.completed = true
          )
          +
          (
            select count(*)
            from public.learner_module_progress lmp
            join public.modules m
              on m.id = lmp.module_id
            join public.days d
              on d.id = m.day_id
            where lmp.learner_id = pe.learner_id
              and d.program_id = target_program_id
              and d.is_published = true
              and m.is_required = true
              and lmp.status = 'completed'
          )
          +
          (
            select count(*)
            from public.checkpoint_results cr
            join public.checkpoints c
              on c.id = cr.checkpoint_id
            join public.days d
              on d.id = c.day_id
            where cr.learner_id = pe.learner_id
              and d.program_id = target_program_id
              and d.is_published = true
              and c.is_required = true
              and cr.status = 'graded'
              and cr.passed = true
          )
        )::numeric
        /
        (
          (
            select count(*)
            from public.setup_items si
            where si.program_id = target_program_id
              and si.is_required = true
          )
          +
          (
            select count(*)
            from public.modules m
            join public.days d
              on d.id = m.day_id
            where d.program_id = target_program_id
              and d.is_published = true
              and m.is_required = true
          )
          +
          (
            select count(*)
            from public.checkpoints c
            join public.days d
              on d.id = c.day_id
            where d.program_id = target_program_id
              and d.is_published = true
              and c.is_required = true
          )
        )::numeric
        * 100,
        2
      )
    end as progress_percent,

    -- --------------------------------------------------------
    -- COMPLETED MODULES
    -- --------------------------------------------------------

    (
      select count(*)
      from public.learner_module_progress lmp
      join public.modules m
        on m.id = lmp.module_id
      join public.days d
        on d.id = m.day_id
      where lmp.learner_id = pe.learner_id
        and d.program_id = target_program_id
        and d.is_published = true
        and m.is_required = true
        and lmp.status = 'completed'
    ) as completed_modules,

    -- --------------------------------------------------------
    -- TOTAL REQUIRED MODULES
    -- --------------------------------------------------------

    (
      select count(*)
      from public.modules m
      join public.days d
        on d.id = m.day_id
      where d.program_id = target_program_id
        and d.is_published = true
        and m.is_required = true
    ) as total_modules,

    -- --------------------------------------------------------
    -- PASSED MODULE QUIZZES
    --
    -- Checkpoint quizzes are intentionally excluded here.
    -- They are represented separately as checkpoints.
    -- --------------------------------------------------------

    (
      select count(distinct qa.quiz_id)
      from public.quiz_attempts qa
      join public.quizzes q
        on q.id = qa.quiz_id
      join public.modules m
        on m.id = q.module_id
      join public.days d
        on d.id = m.day_id
      where qa.learner_id = pe.learner_id
        and d.program_id = target_program_id
        and d.is_published = true
        and q.is_published = true
        and q.is_required = true
        and qa.status = 'graded'
        and qa.passed = true
    ) as passed_quizzes,

    -- --------------------------------------------------------
    -- TOTAL REQUIRED MODULE QUIZZES
    -- --------------------------------------------------------

    (
      select count(*)
      from public.quizzes q
      join public.modules m
        on m.id = q.module_id
      join public.days d
        on d.id = m.day_id
      where d.program_id = target_program_id
        and d.is_published = true
        and q.is_published = true
        and q.is_required = true
    ) as total_quizzes,

    -- --------------------------------------------------------
    -- NEEDS REVIEW
    --
    -- Includes:
    -- - normal module quiz attempts
    -- - checkpoint quiz attempts
    -- --------------------------------------------------------

    (
      select count(*)
      from public.quiz_attempts qa
      join public.quizzes q
        on q.id = qa.quiz_id
      where qa.learner_id = pe.learner_id
        and qa.status = 'needs_review'
        and (
          exists (
            select 1
            from public.modules m
            join public.days d
              on d.id = m.day_id
            where m.id = q.module_id
              and d.program_id = target_program_id
              and d.is_published = true
          )
          or
          exists (
            select 1
            from public.checkpoints c
            join public.days d
              on d.id = c.day_id
            where c.quiz_id = q.id
              and d.program_id = target_program_id
              and d.is_published = true
          )
        )
    ) as needs_review,

    -- --------------------------------------------------------
    -- COMPLETED REQUIRED CHECKPOINTS
    -- --------------------------------------------------------

    (
      select count(*)
      from public.checkpoint_results cr
      join public.checkpoints c
        on c.id = cr.checkpoint_id
      join public.days d
        on d.id = c.day_id
      where cr.learner_id = pe.learner_id
        and d.program_id = target_program_id
        and d.is_published = true
        and c.is_required = true
        and cr.status = 'graded'
        and cr.passed = true
    ) as completed_checkpoints,

    -- --------------------------------------------------------
    -- TOTAL REQUIRED CHECKPOINTS
    -- --------------------------------------------------------

    (
      select count(*)
      from public.checkpoints c
      join public.days d
        on d.id = c.day_id
      where d.program_id = target_program_id
        and d.is_published = true
        and c.is_required = true
    ) as total_checkpoints

  from public.program_enrollments pe

  join public.profiles pr
    on pr.id = pe.learner_id

  where pe.program_id = target_program_id

  order by
    pe.completed_at desc nulls last,
    pe.started_at desc nulls last,
    pr.full_name;

end;
$function$;
