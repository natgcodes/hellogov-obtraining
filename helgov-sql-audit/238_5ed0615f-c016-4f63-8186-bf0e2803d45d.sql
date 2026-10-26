│
◇  Downloading snippet...
-- ============================================================
-- QUERY 107
-- FIX sync_checkpoint_result_from_quiz_attempt
--
-- quiz_attempts:
--   in_progress / needs_review / graded
--
-- checkpoint_results:
--   pending / needs_review / completed
-- ============================================================

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
  -- ATTEMPT
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
    raise exception 'Quiz attempt not found';
  end if;


  -- ==========================================================
  -- CHECKPOINT
  --
  -- If this quiz does not belong to a checkpoint,
  -- there is nothing to synchronize.
  -- ==========================================================

  select
    c.id,
    c.day_id,
    c.quiz_id
  into v_checkpoint
  from public.checkpoints c
  where c.quiz_id = v_attempt.quiz_id
  limit 1;

  if v_checkpoint.id is null then
    return;
  end if;


  -- ==========================================================
  -- IN PROGRESS
  --
  -- checkpoint_results uses "pending".
  -- ==========================================================

  if v_attempt.status = 'in_progress' then

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
      'pending',
      null,
      null,
      null,
      null,
      null
    )

    on conflict (learner_id, checkpoint_id)

    do update set
      status = 'pending',
      score = null,
      passed = null,
      submitted_at = null,
      graded_at = null,
      graded_by = null;

    return;

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
      'needs_review',
      v_attempt.score,
      null,
      v_attempt.submitted_at,
      null,
      null
    )

    on conflict (learner_id, checkpoint_id)

    do update set
      status = 'needs_review',
      score = excluded.score,
      passed = null,
      submitted_at = excluded.submitted_at,
      graded_at = null,
      graded_by = null;

    return;

  end if;


  -- ==========================================================
  -- AUTO-GRADED / FINALIZED CHECKPOINT
  --
  -- quiz_attempts uses "graded".
  -- checkpoint_results uses "completed".
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
      'completed',
      v_attempt.score,
      v_attempt.passed,
      v_attempt.submitted_at,
      coalesce(v_attempt.graded_at, now()),
      null
    )

    on conflict (learner_id, checkpoint_id)

    do update set
      status = 'completed',
      score = excluded.score,
      passed = excluded.passed,
      submitted_at = excluded.submitted_at,
      graded_at = excluded.graded_at,
      graded_by = null;

    return;

  end if;

end;
$function$;
