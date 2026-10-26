│
◇  Downloading snippet...
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
      'graded',
      v_final_score,
      v_final_passed,
      coalesce(v_attempt.submitted_at, now()),
      now(),
      auth.uid()
    )

    on conflict (learner_id, checkpoint_id)

    do update set
      status = 'graded',
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
  -- Only applies to normal module quizzes.
  -- ==========================================================

  if v_module_id is not null then

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
      and q.is_published = true;


    select count(*)
    into v_passed_quizzes
    from public.quizzes q
    where q.module_id = v_module_id
      and q.is_required = true
      and q.is_published = true
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
  --
  -- Same denominator as get_program_progress():
  -- required setup + modules + checkpoints.
  -- ==========================================================


  -- Required setup items

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


  -- Required modules

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


  -- Required checkpoints

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
        and cr.status = 'graded'
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
