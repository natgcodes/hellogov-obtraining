│
◇  Downloading snippet...
create or replace function public.sync_checkpoint_result_from_quiz_attempt(
  target_attempt_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_attempt record;
  v_checkpoint record;
begin

  -- ==========================================================
  -- AUTHENTICATION
  -- ==========================================================

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;


  -- ==========================================================
  -- LOAD ATTEMPT
  -- ==========================================================

  select
    qa.id,
    qa.quiz_id,
    qa.learner_id,
    qa.score,
    qa.passed,
    qa.status,
    qa.submitted_at,
    qa.graded_at
  into v_attempt
  from public.quiz_attempts qa
  where qa.id = target_attempt_id;

  if v_attempt.id is null then
    raise exception 'Attempt not found';
  end if;


  -- ==========================================================
  -- AUTHORIZATION
  -- ==========================================================

  if
    auth.uid() <> v_attempt.learner_id
    and not public.is_trainer()
  then
    raise exception 'Access denied';
  end if;


  -- ==========================================================
  -- CHECK WHETHER THIS QUIZ IS A CHECKPOINT
  -- ==========================================================

  select
    c.id,
    c.passing_score
  into v_checkpoint
  from public.checkpoints c
  where c.quiz_id = v_attempt.quiz_id
  limit 1;


  -- Normal module quiz:
  -- nothing to synchronize.

  if v_checkpoint.id is null then
    return;
  end if;


  -- ==========================================================
  -- ATTEMPT MUST ALREADY BE SUBMITTED
  -- ==========================================================

  if v_attempt.submitted_at is null then
    raise exception 'Attempt has not been submitted';
  end if;


  -- ==========================================================
  -- NEEDS MANUAL REVIEW
  -- ==========================================================

  if v_attempt.status = 'needs_review' then

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
      v_attempt.learner_id,
      v_checkpoint.id,
      'pending_review',
      v_attempt.score,
      null,
      v_attempt.submitted_at,
      null,
      null
    )

    on conflict (learner_id, checkpoint_id)

    do update set
      status = 'pending_review',
      score = excluded.score,
      passed = null,
      submitted_at = excluded.submitted_at,
      graded_at = null,
      graded_by = null;

    return;

  end if;


  -- ==========================================================
  -- AUTO-GRADED CHECKPOINT
  -- ==========================================================

  if v_attempt.status = 'graded' then

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
      v_attempt.learner_id,
      v_checkpoint.id,
      'graded',
      v_attempt.score,
      v_attempt.passed,
      v_attempt.submitted_at,
      coalesce(v_attempt.graded_at, now()),
      null
    )

    on conflict (learner_id, checkpoint_id)

    do update set
      status = 'graded',
      score = excluded.score,
      passed = excluded.passed,
      submitted_at = excluded.submitted_at,
      graded_at = excluded.graded_at,
      graded_by = null;

  end if;

end;
$function$;
