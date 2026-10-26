│
◇  Downloading snippet...
-- ============================================================
-- QUERY 70
-- Finalize Manual Checkpoint Quiz Review
-- ============================================================

create or replace function public.finalize_checkpoint_quiz_review(
  target_attempt_id uuid
)
returns table (
  score numeric,
  passed boolean,
  status text,
  checkpoint_status text,
  program_status text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_attempt record;
  v_checkpoint record;

  v_total_points numeric := 0;
  v_earned_points numeric := 0;
  v_pending_manual integer := 0;

  v_final_score numeric := 0;
  v_final_passed boolean := false;

  v_program_status text := 'not_started';
begin

  -- ==========================================================
  -- SECURITY
  -- ==========================================================

  if not public.is_trainer() then
    raise exception 'Trainer access required';
  end if;


  -- ==========================================================
  -- ATTEMPT
  -- ==========================================================

  select
    qa.id,
    qa.quiz_id,
    qa.learner_id,
    qa.submitted_at,
    q.passing_score
  into v_attempt
  from public.quiz_attempts qa
  join public.quizzes q
    on q.id = qa.quiz_id
  where qa.id = target_attempt_id;

  if v_attempt.id is null then
    raise exception 'Attempt not found';
  end if;

  if v_attempt.submitted_at is null then
    raise exception 'Attempt has not been submitted';
  end if;


  -- ==========================================================
  -- CHECKPOINT
  -- ==========================================================

  select
    c.id,
    c.day_id,
    c.passing_score,
    d.program_id
  into v_checkpoint
  from public.checkpoints c
  join public.days d
    on d.id = c.day_id
  where c.quiz_id = v_attempt.quiz_id
  limit 1;

  if v_checkpoint.id is null then
    raise exception 'This quiz is not attached to a checkpoint';
  end if;


  -- ==========================================================
  -- VERIFY MANUAL ANSWERS
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
    raise exception 'Manual answers still require grading';
  end if;


  -- ==========================================================
  -- CALCULATE FINAL SCORE
  -- ==========================================================

  select coalesce(sum(qq.points), 0)
  into v_total_points
  from public.quiz_questions qq
  where qq.quiz_id = v_attempt.quiz_id;


  select coalesce(sum(a.points_awarded), 0)
  into v_earned_points
  from public.quiz_answers a
  where a.attempt_id = target_attempt_id;


  if v_total_points > 0 then

    v_final_score :=
      round(
        (
          v_earned_points
          /
          v_total_points
        ) * 100,
        2
      );

  else

    v_final_score := 0;

  end if;


  -- Prefer the checkpoint threshold when configured.
  -- Otherwise use the quiz passing score.

  v_final_passed :=
    v_final_score >= coalesce(
      v_checkpoint.passing_score,
      v_attempt.passing_score,
      0
    );


  -- ==========================================================
  -- FINALIZE QUIZ ATTEMPT
  -- ==========================================================

  update public.quiz_attempts qa
  set
    score = v_final_score,
    passed = v_final_passed,
    status = 'graded',
    graded_at = now()
  where qa.id = target_attempt_id;


  /*
   * Query 63's quiz_attempts trigger will now detect
   * this change and synchronize checkpoint_results.
   *
   * Query 68's checkpoint_results trigger will then
   * recalculate the program enrollment automatically.
   */


  -- ==========================================================
  -- READ FINAL PROGRAM STATUS
  -- ==========================================================

  select pe.status
  into v_program_status
  from public.program_enrollments pe
  where pe.program_id = v_checkpoint.program_id
    and pe.learner_id = v_attempt.learner_id
  limit 1;


  -- ==========================================================
  -- RETURN RESULT
  -- ==========================================================

  return query
  select
    v_final_score,
    v_final_passed,
    'graded'::text,
    'graded'::text,
    coalesce(
      v_program_status,
      'not_started'
    );

end;
$function$;
