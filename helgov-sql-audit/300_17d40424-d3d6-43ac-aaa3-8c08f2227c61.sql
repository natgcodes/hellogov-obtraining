│
◇  Downloading snippet...
create or replace function public.get_submission_correct_options(
  target_attempt_id uuid,
  target_question_id uuid
)
returns table(
  option_text text,
  position integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_learner_id uuid;
  v_attempt_quiz_id uuid;
  v_question_quiz_id uuid;
  v_attempt_number integer;
  v_submitted_at timestamptz;
  v_passed boolean;
  v_max_attempts integer;
  v_show_results boolean;
  v_is_trainer boolean;
  v_can_reveal boolean := false;
begin

  -- ----------------------------------------------------------
  -- AUTHENTICATION
  -- ----------------------------------------------------------

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  v_is_trainer := public.is_trainer();

  -- ----------------------------------------------------------
  -- ATTEMPT + QUIZ SETTINGS
  -- ----------------------------------------------------------

  select
    qa.learner_id,
    qa.quiz_id,
    qa.attempt_number,
    qa.submitted_at,
    qa.passed,
    q.max_attempts,
    q.show_results
  into
    v_learner_id,
    v_attempt_quiz_id,
    v_attempt_number,
    v_submitted_at,
    v_passed,
    v_max_attempts,
    v_show_results
  from public.quiz_attempts qa
  join public.quizzes q
    on q.id = qa.quiz_id
  where qa.id = target_attempt_id;

  if v_learner_id is null
     or v_submitted_at is null
  then
    raise exception 'Submission not found or access denied';
  end if;

  -- ----------------------------------------------------------
  -- AUTHORIZATION
  -- ----------------------------------------------------------

  if auth.uid() <> v_learner_id
     and not v_is_trainer
  then
    raise exception 'Submission not found or access denied';
  end if;

  -- ----------------------------------------------------------
  -- VERIFY QUESTION BELONGS TO THIS ATTEMPT'S QUIZ
  -- ----------------------------------------------------------

  select qq.quiz_id
  into v_question_quiz_id
  from public.quiz_questions qq
  where qq.id = target_question_id;

  if v_question_quiz_id is null
     or v_question_quiz_id <> v_attempt_quiz_id
  then
    raise exception 'Question not found or access denied';
  end if;

  -- ----------------------------------------------------------
  -- CORRECT ANSWER VISIBILITY
  -- ----------------------------------------------------------

  if v_is_trainer then
    v_can_reveal := true;

  elsif coalesce(v_show_results, false) = true
        and (
          coalesce(v_passed, false) = true
          or v_attempt_number >= v_max_attempts
        )
  then
    v_can_reveal := true;
  end if;

  -- ----------------------------------------------------------
  -- DO NOT LEAK ANSWERS
  -- ----------------------------------------------------------

  if not v_can_reveal then
    return;
  end if;

  -- ----------------------------------------------------------
  -- RETURN CORRECT OPTIONS
  -- ----------------------------------------------------------

  return query

  select
    qo.option_text,
    qo.position
  from public.quiz_options qo
  where qo.question_id = target_question_id
    and qo.is_correct = true
  order by qo.position;

end;
$function$;
