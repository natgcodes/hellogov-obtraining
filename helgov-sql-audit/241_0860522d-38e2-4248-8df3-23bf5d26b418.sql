│
◇  Downloading snippet...
-- ============================================================
-- QUERY 104
-- Final checkpoint status alignment
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
-- 104A — get_trainer_learner_activity
-- ============================================================

create or replace function public.get_trainer_learner_activity(
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
  -- NORMAL QUIZ ACTIVITY
  -- Checkpoint quizzes excluded.
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

      when qa.status = 'in_progress'
        then 'quiz_started'

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

      when qa.status = 'in_progress'
        then 'Quiz started'

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

    and not exists (
      select 1
      from public.checkpoints c
      where c.quiz_id = q.id
    )

  union all

  -- ==========================================================
  -- CHECKPOINT ACTIVITY
  -- ==========================================================

  select
    case
      when cr.status = 'pending'
        then 'checkpoint_started'

      when cr.status = 'needs_review'
        then 'checkpoint_submitted'

      when cr.status = 'completed'
        and cr.passed = true
        then 'checkpoint_passed'

      when cr.status = 'completed'
        and cr.passed = false
        then 'checkpoint_not_passed'

      else 'checkpoint_activity'
    end::text as event_type,

    cr.id as event_id,

    c.title as title,

    case
      when cr.status = 'pending'
        then 'Checkpoint started'

      when cr.status = 'needs_review'
        then 'Checkpoint submitted · Pending review'

      when cr.status = 'completed'
        and cr.passed = true
        then 'Checkpoint passed'

      when cr.status = 'completed'
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

  order by occurred_at desc nulls last;

end;
$function$;


-- ============================================================
-- 104B — finalize_quiz_review_with_progress
-- ============================================================

create or replace function public.finalize_quiz_review_with_progress(
  target_attempt_id uuid
)
returns table(
  score numeric,
  passed boolean,
  status text,
  module_status text,
  program_status text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_attempt record;

  v_quiz_id uuid;
  v_learner_id uuid;
  v_module_id uuid;
  v_checkpoint_id uuid;
  v_day_id uuid;
  v_program_id uuid;

  v_total_points numeric := 0;
  v_earned_points numeric := 0;
  v_pending_manual integer := 0;

  v_final_score numeric := 0;
  v_final_passed boolean := false;

  v_required_materials integer := 0;
  v_completed_materials integer := 0;

  v_required_activities integer := 0;
  v_completed_activities integer := 0;

  v_required_quizzes integer := 0;
  v_passed_quizzes integer := 0;

  v_module_status text := null;

  v_total_required integer := 0;
  v_total_completed integer := 0;

  v_program_progress numeric := 0;
  v_program_status text := 'not_started';

begin

  -- ==========================================================
  -- SECURITY
  -- ==========================================================

  if not public.is_trainer() then
    raise exception 'Trainer access required';
  end if;

  -- ==========================================================
  -- ATTEMPT + QUIZ
  -- ==========================================================

  select
    qa.id,
    qa.quiz_id,
    qa.learner_id,
    qa.submitted_at,
    q.passing_score,
    q.module_id
  into v_attempt
  from public.quiz_attempts qa
  join public.quizzes q
    on q.id = qa.quiz_id
  where qa.id = target_attempt_id;

  if v_attempt.id is null then
    raise exception 'Attempt not found';
  end if;

  v_quiz_id := v_attempt.quiz_id;
  v_learner_id := v_attempt.learner_id;
  v_module_id := v_attempt.module_id;

  -- ==========================================================
  -- DETECT CHECKPOINT
  -- ==========================================================

  select
    c.id,
    c.day_id
  into
    v_checkpoint_id,
    v_day_id
  from public.checkpoints c
  where c.quiz_id = v_quiz_id
  limit 1;

  -- ==========================================================
  -- DETERMINE DAY + PROGRAM
  -- ==========================================================

  if v_checkpoint_id is not null then

    select d.program_id
    into v_program_id
    from public.days d
    where d.id = v_day_id;

  elsif v_module_id is not null then

    select
      m.day_id,
      d.program_id
    into
      v_day_id,
      v_program_id
    from public.modules m
    join public.days d
      on d.id = m.day_id
    where m.id = v_module_id;

  else

    raise exception
      'Quiz is not attached to a module or checkpoint';

  end if;

  -- ==========================================================
  -- VERIFY MANUAL GRADING
  -- ==========================================================

  select count(*)
  into v_pending_manual
  from public.quiz_answers a
  join public.quiz_questions qq
    on qq.id = a.question_id
  where a.attempt_id = target_attempt_id
    and qq.question_type in (
      'open_text',
      'file_upload'
    )
    and a.points_awarded is null;

  if v_pending_manual > 0 then
    raise exception
      'Manual answers still require grading';
  end if;

  -- ==========================================================
  -- FINAL SCORE
  -- ==========================================================

  select coalesce(sum(qq.points), 0)
  into v_total_points
  from public.quiz_questions qq
  where qq.quiz_id = v_quiz_id;

  select coalesce(sum(qa.points_awarded), 0)
  into v_earned_points
  from public.quiz_answers qa
  where qa.attempt_id = target_attempt_id;

  if v_total_points > 0 then
    v_final_score :=
      round(
        (v_earned_points / v_total_points) * 100,
        2
      );
  else
    v_final_score := 0;
  end if;

  v_final_passed :=
    v_final_score >= v_attempt.passing_score;

  -- ==========================================================
  -- UPDATE QUIZ ATTEMPT
  --
  -- quiz_attempts DOES use "graded".
  -- ==========================================================

  update public.quiz_attempts qa
  set
    score = v_final_score,
    passed = v_final_passed,
    status = 'graded',
    graded_at = now()
  where qa.id = target_attempt_id;

  -- ==========================================================
  -- CHECKPOINT RESULT
  --
  -- checkpoint_results uses "completed", NOT "graded".
  -- ==========================================================

  if v_checkpoint_id is not null then

    insert into public.checkpoint_results (
      learner_id,
      checkpoint_id,
      status,
      score,
      passed,
      submitted_at,
      graded_at,
      graded_by
    )
    values (
      v_learner_id,
      v_checkpoint_id,
      'completed',
      v_final_score,
      v_final_passed,
      coalesce(v_attempt.submitted_at, now()),
      now(),
      auth.uid()
    )

    on conflict (learner_id, checkpoint_id)

    do update set
      status = 'completed',
      score = excluded.score,
      passed = excluded.passed,

      submitted_at = coalesce(
        public.checkpoint_results.submitted_at,
        excluded.submitted_at
      ),

      graded_at = now(),
      graded_by = auth.uid();

  end if;

  -- ==========================================================
  -- MODULE PROGRESS
  -- Only normal module quizzes.
  -- ==========================================================

  if v_module_id is not null
     and v_checkpoint_id is null
  then

    select count(*)
    into v_required_materials
    from public.materials ma
    where ma.module_id = v_module_id
      and ma.is_required = true;

    select count(*)
    into v_completed_materials
    from public.materials ma
    join public.learner_material_progress lmp
      on lmp.material_id = ma.id
    where ma.module_id = v_module_id
      and ma.is_required = true
      and lmp.learner_id = v_learner_id
      and lmp.completed = true;

    select count(*)
    into v_required_activities
    from public.activities a
    where a.module_id = v_module_id
      and a.is_required = true;

    select count(*)
    into v_completed_activities
    from public.activities a
    join public.learner_activity_progress lap
      on lap.activity_id = a.id
    where a.module_id = v_module_id
      and a.is_required = true
      and lap.learner_id = v_learner_id
      and lap.status = 'completed';

    select count(*)
    into v_required_quizzes
    from public.quizzes q
    where q.module_id = v_module_id
      and q.is_required = true
      and q.is_published = true
      and not exists (
        select 1
        from public.checkpoints c
        where c.quiz_id = q.id
      );

    select count(*)
    into v_passed_quizzes
    from public.quizzes q
    where q.module_id = v_module_id
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
          and qa.learner_id = v_learner_id
          and qa.status = 'graded'
          and qa.passed = true
      );

    if
      v_completed_materials >= v_required_materials
      and
      v_completed_activities >= v_required_activities
      and
      v_passed_quizzes >= v_required_quizzes
    then

      v_module_status := 'completed';

    elsif
      v_completed_materials > 0
      or
      v_completed_activities > 0
      or exists (
        select 1
        from public.quiz_attempts qa
        join public.quizzes q
          on q.id = qa.quiz_id
        where q.module_id = v_module_id
          and qa.learner_id = v_learner_id
          and not exists (
            select 1
            from public.checkpoints c
            where c.quiz_id = q.id
          )
      )
    then

      v_module_status := 'in_progress';

    else

      v_module_status := 'not_started';

    end if;

    insert into public.learner_module_progress (
      learner_id,
      module_id,
      status,
      started_at,
      completed_at,
      updated_at
    )
    values (
      v_learner_id,
      v_module_id,
      v_module_status,

      case
        when v_module_status <> 'not_started'
        then now()
        else null
      end,

      case
        when v_module_status = 'completed'
        then now()
        else null
      end,

      now()
    )

    on conflict (learner_id, module_id)

    do update set
      status = excluded.status,

      started_at =
        case
          when public.learner_module_progress.started_at
            is not null
          then public.learner_module_progress.started_at

          when excluded.status <> 'not_started'
          then now()

          else null
        end,

      completed_at =
        case
          when excluded.status = 'completed'
          then coalesce(
            public.learner_module_progress.completed_at,
            now()
          )
          else null
        end,

      updated_at = now();

  end if;

  -- ==========================================================
  -- PROGRAM PROGRESS
  -- Required setup + modules + checkpoints
  -- ==========================================================

  -- SETUP

  v_total_required :=
    v_total_required +
    (
      select count(*)
      from public.setup_items si
      where si.program_id = v_program_id
        and si.is_required = true
    );

  v_total_completed :=
    v_total_completed +
    (
      select count(*)
      from public.setup_items si
      join public.learner_setup_progress lsp
        on lsp.setup_item_id = si.id
      where si.program_id = v_program_id
        and si.is_required = true
        and lsp.learner_id = v_learner_id
        and lsp.completed = true
    );

  -- MODULES

  v_total_required :=
    v_total_required +
    (
      select count(*)
      from public.modules m
      join public.days d
        on d.id = m.day_id
      where d.program_id = v_program_id
        and d.is_published = true
        and m.is_required = true
    );

  v_total_completed :=
    v_total_completed +
    (
      select count(*)
      from public.modules m
      join public.days d
        on d.id = m.day_id
      join public.learner_module_progress lmp
        on lmp.module_id = m.id
      where d.program_id = v_program_id
        and d.is_published = true
        and m.is_required = true
        and lmp.learner_id = v_learner_id
        and lmp.status = 'completed'
    );

  -- CHECKPOINTS

  v_total_required :=
    v_total_required +
    (
      select count(*)
      from public.checkpoints c
      join public.days d
        on d.id = c.day_id
      where d.program_id = v_program_id
        and d.is_published = true
        and c.is_required = true
    );

  v_total_completed :=
    v_total_completed +
    (
      select count(*)
      from public.checkpoint_results cr
      join public.checkpoints c
        on c.id = cr.checkpoint_id
      join public.days d
        on d.id = c.day_id
      where d.program_id = v_program_id
        and d.is_published = true
        and c.is_required = true
        and cr.learner_id = v_learner_id
        and cr.status = 'completed'
        and cr.passed = true
    );

  -- ==========================================================
  -- PROGRAM STATUS
  -- ==========================================================

  if v_total_required > 0 then

    v_program_progress :=
      round(
        (
          v_total_completed::numeric
          /
          v_total_required::numeric
        ) * 100,
        2
      );

  else

    v_program_progress := 0;

  end if;

  if v_program_progress >= 100 then

    v_program_status := 'completed';

  elsif v_total_completed > 0 then

    v_program_status := 'in_progress';

  else

    v_program_status := 'not_started';

  end if;

  -- ==========================================================
  -- UPDATE ENROLLMENT
  -- ==========================================================

  update public.program_enrollments pe
  set
    status = v_program_status,

    started_at =
      case
        when v_program_status <> 'not_started'
        then coalesce(pe.started_at, now())
        else pe.started_at
      end,

    completed_at =
      case
        when v_program_status = 'completed'
        then coalesce(pe.completed_at, now())
        else null
      end

  where pe.program_id = v_program_id
    and pe.learner_id = v_learner_id;

  -- ==========================================================
  -- RESULT
  -- ==========================================================

  return query
  select
    v_final_score,
    v_final_passed,
    'graded'::text,
    v_module_status,
    v_program_status;

end;
$function$;
