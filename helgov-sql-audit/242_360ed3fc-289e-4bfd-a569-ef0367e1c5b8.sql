│
◇  Downloading snippet...
-- ============================================================
-- QUERY 103
-- Fix Trainer learner functions for checkpoint_results statuses
--
-- checkpoint_results:
--   pending
--   needs_review
--   completed
--
-- quiz_attempts:
--   in_progress
--   needs_review
--   graded
-- ============================================================


-- ============================================================
-- 103A — get_trainer_learner_detail
-- ============================================================

create or replace function public.get_trainer_learner_detail(
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
  completed_setup_items bigint,
  total_setup_items bigint,
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

  if not public.is_trainer() then
    raise exception 'Trainer access required';
  end if;

  return query
  select
    pe.learner_id,
    pr.full_name,
    pr.email,
    pe.status,
    pe.enrolled_at,
    pe.started_at,
    pe.completed_at,

    -- ========================================================
    -- OVERALL PROGRAM PROGRESS
    -- Required setup + modules + checkpoints
    -- ========================================================

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
              and cr.status = 'completed'
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

    -- ========================================================
    -- SETUP
    -- ========================================================

    (
      select count(*)
      from public.learner_setup_progress lsp
      join public.setup_items si
        on si.id = lsp.setup_item_id
      where lsp.learner_id = pe.learner_id
        and si.program_id = target_program_id
        and si.is_required = true
        and lsp.completed = true
    ) as completed_setup_items,

    (
      select count(*)
      from public.setup_items si
      where si.program_id = target_program_id
        and si.is_required = true
    ) as total_setup_items,

    -- ========================================================
    -- MODULES
    -- ========================================================

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

    (
      select count(*)
      from public.modules m
      join public.days d
        on d.id = m.day_id
      where d.program_id = target_program_id
        and d.is_published = true
        and m.is_required = true
    ) as total_modules,

    -- ========================================================
    -- NORMAL MODULE QUIZZES
    -- Checkpoint quizzes excluded.
    -- ========================================================

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
        and not exists (
          select 1
          from public.checkpoints c
          where c.quiz_id = q.id
        )
    ) as passed_quizzes,

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
        and not exists (
          select 1
          from public.checkpoints c
          where c.quiz_id = q.id
        )
    ) as total_quizzes,

    -- ========================================================
    -- CHECKPOINTS
    -- ========================================================

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
        and cr.status = 'completed'
        and cr.passed = true
    ) as completed_checkpoints,

    (
      select count(*)
      from public.checkpoints c
      join public.days d
        on d.id = c.day_id
      where d.program_id = target_program_id
        and d.is_published = true
        and c.is_required = true
    ) as total_checkpoints,

    -- ========================================================
    -- NEEDS REVIEW
    -- Normal quizzes + checkpoint quizzes
    -- ========================================================

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
    ) as needs_review

  from public.program_enrollments pe

  join public.profiles pr
    on pr.id = pe.learner_id

  where pe.program_id = target_program_id
    and pe.learner_id = target_learner_id;

end;
$function$;


-- ============================================================
-- 103B — get_trainer_learners
-- ============================================================

create or replace function public.get_trainer_learners(
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

  if not public.is_trainer() then
    raise exception 'Trainer access required';
  end if;

  return query
  select
    pe.learner_id,
    pr.full_name,
    pr.email,
    pe.status,
    pe.enrolled_at,
    pe.started_at,
    pe.completed_at,

    -- ========================================================
    -- OVERALL PROGRESS
    -- ========================================================

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
              and cr.status = 'completed'
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

    -- ========================================================
    -- MODULES
    -- ========================================================

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

    (
      select count(*)
      from public.modules m
      join public.days d
        on d.id = m.day_id
      where d.program_id = target_program_id
        and d.is_published = true
        and m.is_required = true
    ) as total_modules,

    -- ========================================================
    -- NORMAL QUIZZES
    -- ========================================================

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
        and not exists (
          select 1
          from public.checkpoints c
          where c.quiz_id = q.id
        )
    ) as passed_quizzes,

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
        and not exists (
          select 1
          from public.checkpoints c
          where c.quiz_id = q.id
        )
    ) as total_quizzes,

    -- ========================================================
    -- NEEDS REVIEW
    -- ========================================================

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

    -- ========================================================
    -- CHECKPOINTS
    -- ========================================================

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
        and cr.status = 'completed'
        and cr.passed = true
    ) as completed_checkpoints,

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


-- ============================================================
-- 103C — get_trainer_learner_checkpoints
-- ============================================================

create or replace function public.get_trainer_learner_checkpoints(
  target_program_id uuid,
  target_learner_id uuid
)
returns table(
  checkpoint_id uuid,
  quiz_id uuid,
  title text,
  description text,
  checkpoint_type text,
  day_id uuid,
  day_number integer,
  day_title text,
  day_position integer,
  checkpoint_position integer,
  is_required boolean,
  passing_score numeric,
  result_id uuid,
  result_status text,
  score numeric,
  passed boolean,
  submitted_at timestamptz,
  graded_at timestamptz,
  trainer_feedback text,
  checkpoint_status text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin

  if not public.is_trainer() then
    raise exception 'Trainer access required';
  end if;

  if not exists (
    select 1
    from public.program_enrollments pe
    where pe.program_id = target_program_id
      and pe.learner_id = target_learner_id
  ) then
    raise exception 'Learner is not enrolled in this program';
  end if;

  return query

  select
    c.id as checkpoint_id,
    c.quiz_id as quiz_id,
    c.title as title,
    c.description as description,
    c.checkpoint_type as checkpoint_type,

    d.id as day_id,
    d.day_number as day_number,
    d.title as day_title,
    d.position as day_position,

    c.position as checkpoint_position,
    c.is_required as is_required,

    coalesce(
      c.passing_score,
      q.passing_score
    ) as passing_score,

    cr.id as result_id,
    cr.status as result_status,
    cr.score as score,
    cr.passed as passed,
    cr.submitted_at as submitted_at,
    cr.graded_at as graded_at,
    cr.trainer_feedback as trainer_feedback,

    case
      when cr.id is null
        then 'not_started'

      when cr.status = 'pending'
        then 'in_progress'

      when cr.status = 'needs_review'
        then 'needs_review'

      when cr.status = 'completed'
        and cr.passed = true
        then 'passed'

      when cr.status = 'completed'
        and cr.passed = false
        then 'not_passed'

      else coalesce(
        cr.status,
        'not_started'
      )
    end::text as checkpoint_status

  from public.checkpoints c

  join public.days d
    on d.id = c.day_id

  left join public.quizzes q
    on q.id = c.quiz_id

  left join public.checkpoint_results cr
    on cr.checkpoint_id = c.id
    and cr.learner_id = target_learner_id

  where d.program_id = target_program_id
    and d.is_published = true

  order by
    d.position,
    d.day_number,
    c.position,
    c.title;

end;
$function$;
