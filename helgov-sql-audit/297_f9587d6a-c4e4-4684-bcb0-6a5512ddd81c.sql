│
◇  Downloading snippet...
-- ============================================================
-- QUERY 53
-- INTEGRATE CHECKPOINTS INTO REVIEW, DAY COMPLETION & PROGRESS
-- ============================================================


-- ============================================================
-- 1. REVIEW QUEUE
-- Supports:
--   - regular module quizzes
--   - checkpoint quizzes
-- ============================================================

create or replace function public.get_quiz_review_queue(
  target_program_id uuid
)
returns table(
  attempt_id uuid,
  learner_id uuid,
  learner_name text,
  learner_email text,
  quiz_id uuid,
  quiz_title text,
  submitted_at timestamptz,
  current_score numeric,
  pending_answers bigint
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
    qa.id,
    qa.learner_id,
    p.full_name,
    p.email,
    q.id,
    q.title,
    qa.submitted_at,
    qa.score,

    (
      select count(*)
      from public.quiz_answers ans
      join public.quiz_questions qq
        on qq.id = ans.question_id
      where ans.attempt_id = qa.id
        and qq.question_type in (
          'open_text',
          'file_upload'
        )
        and ans.points_awarded is null
    ) as pending_answers

  from public.quiz_attempts qa

  join public.profiles p
    on p.id = qa.learner_id

  join public.quizzes q
    on q.id = qa.quiz_id

  left join public.modules m
    on m.id = q.module_id

  left join public.days module_day
    on module_day.id = m.day_id

  left join public.checkpoints cp
    on cp.quiz_id = q.id

  left join public.days checkpoint_day
    on checkpoint_day.id = cp.day_id

  where qa.status = 'needs_review'

    and coalesce(
      module_day.program_id,
      checkpoint_day.program_id
    ) = target_program_id

  order by qa.submitted_at asc;

end;
$function$;


-- ============================================================
-- 2. DAY COMPLETION
--
-- A day is complete only when:
--   - all required modules are completed
--   - every checkpoint has a completed/passing assessment
--
-- Checkpoints currently do not have is_required,
-- so every checkpoint attached to the day is treated
-- as required.
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
  checkpoint_count integer;
  incomplete_checkpoint_count integer;
begin

  if auth.uid() is null then
    return false;
  end if;


  -- ----------------------------------------------------------
  -- REQUIRED MODULES
  -- ----------------------------------------------------------

  select count(*)
  into required_module_count
  from public.modules
  where day_id = target_day_id
    and is_required = true;


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


  -- ----------------------------------------------------------
  -- CHECKPOINTS
  -- ----------------------------------------------------------

  select count(*)
  into checkpoint_count
  from public.checkpoints cp
  where cp.day_id = target_day_id;


  /*
   * A checkpoint is complete when the learner has
   * a submitted quiz attempt that:
   *
   *   - belongs to that checkpoint's quiz
   *   - has finished processing
   *   - passed
   *
   * This uses quiz_attempts as the assessment
   * source of truth.
   */

  select count(*)
  into incomplete_checkpoint_count
  from public.checkpoints cp
  where cp.day_id = target_day_id

    and (
      cp.quiz_id is null

      or not exists (
        select 1
        from public.quiz_attempts qa
        where qa.quiz_id = cp.quiz_id
          and qa.learner_id = auth.uid()
          and qa.submitted_at is not null
          and qa.passed = true
          and qa.status <> 'needs_review'
      )
    );


  -- ----------------------------------------------------------
  -- EMPTY DAY PROTECTION
  -- ----------------------------------------------------------

  if required_module_count = 0
     and checkpoint_count = 0
  then
    return false;
  end if;


  return
    incomplete_module_count = 0
    and incomplete_checkpoint_count = 0;

end;
$function$;


-- ============================================================
-- 3. PROGRAM PROGRESS
--
-- Counts:
--   - required setup
--   - required modules
--   - checkpoints
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
  total_items int := 0;
  completed_items int := 0;
begin

  if auth.uid() is null then
    return 0;
  end if;


  -- ----------------------------------------------------------
  -- REQUIRED SETUP
  -- ----------------------------------------------------------

  select count(*)
  into total_items
  from public.setup_items
  where program_id = target_program_id
    and is_required = true;


  select count(*)
  into completed_items
  from public.setup_items si

  join public.learner_setup_progress lsp
    on lsp.setup_item_id = si.id

  where si.program_id = target_program_id
    and si.is_required = true
    and lsp.learner_id = auth.uid()
    and lsp.completed = true;


  -- ----------------------------------------------------------
  -- REQUIRED MODULES
  -- ----------------------------------------------------------

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


  -- ----------------------------------------------------------
  -- CHECKPOINTS
  -- ----------------------------------------------------------

  total_items :=
    total_items +
    (
      select count(*)

      from public.checkpoints cp

      join public.days d
        on d.id = cp.day_id

      where d.program_id = target_program_id
        and d.is_published = true
    );


  completed_items :=
    completed_items +
    (
      select count(*)

      from public.checkpoints cp

      join public.days d
        on d.id = cp.day_id

      where d.program_id = target_program_id
        and d.is_published = true

        and cp.quiz_id is not null

        and exists (
          select 1

          from public.quiz_attempts qa

          where qa.quiz_id = cp.quiz_id
            and qa.learner_id = auth.uid()
            and qa.submitted_at is not null
            and qa.passed = true
            and qa.status <> 'needs_review'
        )
    );


  -- ----------------------------------------------------------
  -- RESULT
  -- ----------------------------------------------------------

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
