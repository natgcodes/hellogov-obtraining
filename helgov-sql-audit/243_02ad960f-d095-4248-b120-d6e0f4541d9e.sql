│
◇  Downloading snippet...
-- ============================================================
-- QUERY 102
-- Fix checkpoint_results status usage
--
-- checkpoint_results valid statuses:
--   pending
--   needs_review
--   completed
--
-- quiz_attempts continues using:
--   in_progress
--   needs_review
--   graded
-- ============================================================


-- ============================================================
-- 102A — get_program_progress
-- ============================================================

create or replace function public.get_program_progress(
  target_program_id uuid
)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  total_items integer := 0;
  completed_items integer := 0;
begin

  if auth.uid() is null then
    return 0;
  end if;

  -- REQUIRED SETUP ITEMS

  total_items :=
    total_items +
    (
      select count(*)
      from public.setup_items si
      where si.program_id = target_program_id
        and si.is_required = true
    );

  completed_items :=
    completed_items +
    (
      select count(*)
      from public.setup_items si
      join public.learner_setup_progress lsp
        on lsp.setup_item_id = si.id
      where si.program_id = target_program_id
        and si.is_required = true
        and lsp.learner_id = auth.uid()
        and lsp.completed = true
    );

  -- REQUIRED MODULES

  total_items :=
    total_items +
    (
      select count(*)
      from public.modules m
      join public.days d
        on d.id = m.day_id
      where d.program_id = target_program_id
        and d.is_published = true
        and m.is_required = true
    );

  completed_items :=
    completed_items +
    (
      select count(*)
      from public.learner_module_progress lmp
      join public.modules m
        on m.id = lmp.module_id
      join public.days d
        on d.id = m.day_id
      where d.program_id = target_program_id
        and d.is_published = true
        and m.is_required = true
        and lmp.learner_id = auth.uid()
        and lmp.status = 'completed'
    );

  -- REQUIRED CHECKPOINTS

  total_items :=
    total_items +
    (
      select count(*)
      from public.checkpoints c
      join public.days d
        on d.id = c.day_id
      where d.program_id = target_program_id
        and d.is_published = true
        and c.is_required = true
    );

  completed_items :=
    completed_items +
    (
      select count(*)
      from public.checkpoint_results cr
      join public.checkpoints c
        on c.id = cr.checkpoint_id
      join public.days d
        on d.id = c.day_id
      where d.program_id = target_program_id
        and d.is_published = true
        and c.is_required = true
        and cr.learner_id = auth.uid()
        and cr.status = 'completed'
        and cr.passed = true
    );

  if total_items = 0 then
    return 0;
  end if;

  return round(
    (
      completed_items::numeric
      /
      total_items::numeric
    ) * 100,
    2
  );

end;
$function$;


-- ============================================================
-- 102B — is_day_complete
-- ============================================================

create or replace function public.is_day_complete(
  target_day_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  required_module_count integer;
  incomplete_module_count integer;

  required_checkpoint_count integer;
  incomplete_checkpoint_count integer;
begin

  if auth.uid() is null then
    return false;
  end if;

  -- REQUIRED MODULES

  select count(*)
  into required_module_count
  from public.modules m
  where m.day_id = target_day_id
    and m.is_required = true;

  select count(*)
  into incomplete_module_count
  from public.modules m
  where m.day_id = target_day_id
    and m.is_required = true
    and not exists (
      select 1
      from public.learner_module_progress lmp
      where lmp.module_id = m.id
        and lmp.learner_id = auth.uid()
        and lmp.status = 'completed'
    );

  -- REQUIRED CHECKPOINTS

  select count(*)
  into required_checkpoint_count
  from public.checkpoints c
  where c.day_id = target_day_id
    and c.is_required = true;

  select count(*)
  into incomplete_checkpoint_count
  from public.checkpoints c
  where c.day_id = target_day_id
    and c.is_required = true
    and not exists (
      select 1
      from public.checkpoint_results cr
      where cr.checkpoint_id = c.id
        and cr.learner_id = auth.uid()
        and cr.status = 'completed'
        and cr.passed = true
    );

  if
    required_module_count = 0
    and required_checkpoint_count = 0
  then
    return false;
  end if;

  return
    incomplete_module_count = 0
    and
    incomplete_checkpoint_count = 0;

end;
$function$;


-- ============================================================
-- 102C — get_trainer_learner_day_progress
-- ============================================================

create or replace function public.get_trainer_learner_day_progress(
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

  with day_stats as (

    select
      d.id,
      d.day_number,
      d.title,
      d.position,

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
              and cr.status = 'completed'
              and cr.passed = true
          )
      ) as completed_checkpoints,

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
