│
◇  Downloading snippet...
drop function if exists public.get_learner_submission_detail(uuid);

create or replace function public.get_learner_submission_detail(
  target_attempt_id uuid
)
returns table(
  answer_id uuid,
  question_id uuid,
  question_position integer,
  question_text text,
  question_type text,
  question_points numeric,
  answer_text text,
  file_path text,
  file_name text,
  is_correct boolean,
  points_awarded numeric,
  trainer_feedback text,
  answer_graded_at timestamptz,
  selected_option_text text,
  match_left_text text,
  match_right_text text,
  match_position integer,

  can_reveal_correct_answer boolean,
  correct_option_text text,
  correct_match_right_text text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_learner_id uuid;
  v_quiz_id uuid;
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
    v_quiz_id,
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
  -- CORRECT ANSWER VISIBILITY
  --
  -- Trainer:
  --   Always allowed.
  --
  -- Learner:
  --   show_results must be enabled
  --   AND either:
  --     - assessment has been passed
  --     - all attempts have been used
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
  -- 1. STANDARD ANSWERS
  --
  -- Single Choice
  -- True / False
  -- Open Text
  -- File Upload
  -- ----------------------------------------------------------

  return query

  select
    ans.id as answer_id,
    ans.question_id,
    qq.position as question_position,
    qq.question_text,
    qq.question_type,
    qq.points as question_points,
    ans.answer_text,
    ans.file_path,
    ans.file_name,
    ans.is_correct,
    ans.points_awarded,
    ans.trainer_feedback,
    ans.graded_at as answer_graded_at,

    selected_option.option_text
      as selected_option_text,

    null::text as match_left_text,
    null::text as match_right_text,
    null::integer as match_position,

    v_can_reveal
      as can_reveal_correct_answer,

    case
      when v_can_reveal
       and qq.question_type in (
         'single_choice',
         'true_false'
       )
      then correct_option.option_text
      else null
    end as correct_option_text,

    null::text
      as correct_match_right_text

  from public.quiz_answers ans

  join public.quiz_questions qq
    on qq.id = ans.question_id

  left join public.quiz_options selected_option
    on selected_option.id = ans.selected_option_id

  left join public.quiz_options correct_option
    on correct_option.question_id = ans.question_id
   and correct_option.is_correct = true

  where ans.attempt_id = target_attempt_id
    and qq.question_type not in (
      'matching',
      'match_cards',
      'multiple_choice'
    )

  union all

  -- ----------------------------------------------------------
  -- 2. MULTIPLE CHOICE
  --
  -- Selected learner answers are returned normally.
  --
  -- Correct options are intentionally NOT revealed here yet.
  -- We will retrieve the complete correct set separately in
  -- the UI-safe step after this migration.
  -- ----------------------------------------------------------

  select
    ans.id as answer_id,
    ans.question_id,
    qq.position as question_position,
    qq.question_text,
    qq.question_type,
    qq.points as question_points,
    ans.answer_text,
    ans.file_path,
    ans.file_name,
    ans.is_correct,
    ans.points_awarded,
    ans.trainer_feedback,
    ans.graded_at as answer_graded_at,

    selected_option.option_text
      as selected_option_text,

    null::text as match_left_text,
    null::text as match_right_text,

    selected_option.position
      as match_position,

    v_can_reveal
      as can_reveal_correct_answer,

    null::text
      as correct_option_text,

    null::text
      as correct_match_right_text

  from public.quiz_answers ans

  join public.quiz_questions qq
    on qq.id = ans.question_id

  join public.quiz_answer_options qao
    on qao.answer_id = ans.id

  join public.quiz_options selected_option
    on selected_option.id = qao.option_id

  where ans.attempt_id = target_attempt_id
    and qq.question_type = 'multiple_choice'

  union all

  -- ----------------------------------------------------------
  -- 3. MATCHING / MATCH CARDS
  -- ----------------------------------------------------------

  select
    ans.id as answer_id,
    ans.question_id,
    qq.position as question_position,
    qq.question_text,
    qq.question_type,
    qq.points as question_points,
    ans.answer_text,
    ans.file_path,
    ans.file_name,
    ans.is_correct,
    ans.points_awarded,
    ans.trainer_feedback,
    ans.graded_at as answer_graded_at,

    null::text
      as selected_option_text,

    left_pair.left_text
      as match_left_text,

    selected_right.right_text
      as match_right_text,

    left_pair.position
      as match_position,

    v_can_reveal
      as can_reveal_correct_answer,

    null::text
      as correct_option_text,

    case
      when v_can_reveal
      then left_pair.right_text
      else null
    end as correct_match_right_text

  from public.quiz_answers ans

  join public.quiz_questions qq
    on qq.id = ans.question_id

  join public.quiz_answer_matches qam
    on qam.answer_id = ans.id

  join public.quiz_matching_pairs left_pair
    on left_pair.id = qam.left_pair_id

  join public.quiz_matching_pairs selected_right
    on selected_right.question_id = ans.question_id
   and selected_right.right_public_id =
       qam.selected_right_public_id

  where ans.attempt_id = target_attempt_id
    and qq.question_type in (
      'matching',
      'match_cards'
    )

  order by
    question_position,
    match_position nulls first;

end;
$function$;
