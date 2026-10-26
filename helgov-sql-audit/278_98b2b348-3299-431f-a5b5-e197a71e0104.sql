│
◇  Downloading snippet...
-- ============================================================
-- QUERY 71
-- Control Correct Answer Reveal
-- ============================================================

create or replace function public.can_reveal_quiz_answers(
  target_attempt_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_attempt record;
begin

  -- ==========================================================
  -- AUTHENTICATION
  -- ==========================================================

  if auth.uid() is null then
    return false;
  end if;


  -- ==========================================================
  -- LOAD ATTEMPT + QUIZ SETTINGS
  -- ==========================================================

  select
    qa.id,
    qa.learner_id,
    qa.attempt_number,
    qa.passed,
    qa.status,
    qa.submitted_at,

    q.max_attempts,
    q.show_results

  into v_attempt

  from public.quiz_attempts qa

  join public.quizzes q
    on q.id = qa.quiz_id

  where qa.id = target_attempt_id;


  -- ==========================================================
  -- ATTEMPT EXISTS
  -- ==========================================================

  if v_attempt.id is null then
    return false;
  end if;


  -- ==========================================================
  -- AUTHORIZATION
  -- ==========================================================

  if
    auth.uid() <> v_attempt.learner_id
    and not public.is_trainer()
  then
    return false;
  end if;


  -- ==========================================================
  -- TRAINERS MAY ALWAYS REVIEW
  -- ==========================================================

  if public.is_trainer() then
    return true;
  end if;


  -- ==========================================================
  -- QUIZ RESULTS DISABLED
  -- ==========================================================

  if coalesce(v_attempt.show_results, false) = false then
    return false;
  end if;


  -- ==========================================================
  -- ACTIVE / UNSUBMITTED ATTEMPT
  -- ==========================================================

  if v_attempt.submitted_at is null then
    return false;
  end if;


  -- ==========================================================
  -- MANUAL REVIEW STILL PENDING
  -- ==========================================================

  if v_attempt.status = 'needs_review' then
    return false;
  end if;


  -- ==========================================================
  -- PASSED
  --
  -- Once the learner passes, answers may be revealed.
  -- ==========================================================

  if v_attempt.passed = true then
    return true;
  end if;


  -- ==========================================================
  -- FAILED + UNLIMITED ATTEMPTS
  --
  -- NULL max_attempts is treated as unlimited.
  -- Therefore correct answers stay hidden.
  -- ==========================================================

  if v_attempt.max_attempts is null then
    return false;
  end if;


  -- ==========================================================
  -- FAILED + ATTEMPTS REMAINING
  -- ==========================================================

  if
    v_attempt.attempt_number <
    v_attempt.max_attempts
  then
    return false;
  end if;


  -- ==========================================================
  -- FAILED + FINAL ATTEMPT USED
  -- ==========================================================

  return true;

end;
$function$;
