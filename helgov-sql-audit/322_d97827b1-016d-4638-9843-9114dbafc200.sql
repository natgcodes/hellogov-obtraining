│
◇  Downloading snippet...
-- Query 31 — Add Multiple Choice to Submission Detail
-- Extends the learner submission detail RPC so Multiple Choice
-- selections are also returned safely after submission.

drop function if exists public.get_learner_submission_detail(uuid);

create function public.get_learner_submission_detail(
  target_attempt_id uuid
)
returns table (
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
  match_position integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin

  /*
   * SECURITY
   *
   * The learner can only retrieve:
   * - their own attempt
   * - after it has been submitted
   */

  if not exists (
    select 1
    from public.quiz_attempts qa
    where qa.id = target_attempt_id
      and qa.learner_id = auth.uid()
      and qa.submitted_at is not null
  ) then
    raise exception
      'Submission not found or access denied';
  end if;

  return query

  /*
   * 1. STANDARD ANSWERS
   *
   * Single Choice
   * True / False
   * Open Text
   * File Upload
   */

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

    qo.option_text as selected_option_text,

    null::text as match_left_text,
    null::text as match_right_text,
    null::integer as match_position

  from public.quiz_answers ans

  join public.quiz_questions qq
    on qq.id = ans.question_id

  left join public.quiz_options qo
    on qo.id = ans.selected_option_id

  where ans.attempt_id = target_attempt_id
    and qq.question_type not in (
      'matching',
      'match_cards',
      'multiple_choice'
    )

  union all

  /*
   * 2. MULTIPLE CHOICE
   *
   * One row is returned for each option
   * selected by the learner.
   */

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
      as match_position

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

  /*
   * 3. MATCHING / MATCH CARDS
   *
   * One row is returned for every pair
   * submitted by the learner.
   */

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

    null::text as selected_option_text,

    left_pair.left_text
      as match_left_text,

    right_pair.right_text
      as match_right_text,

    left_pair.position
      as match_position

  from public.quiz_answers ans

  join public.quiz_questions qq
    on qq.id = ans.question_id

  join public.quiz_answer_matches qam
    on qam.answer_id = ans.id

  join public.quiz_matching_pairs left_pair
    on left_pair.id = qam.left_pair_id

  join public.quiz_matching_pairs right_pair
    on right_pair.question_id =
       ans.question_id
   and right_pair.right_public_id =
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
$$;

revoke all on function
  public.get_learner_submission_detail(uuid)
from public;

grant execute on function
  public.get_learner_submission_detail(uuid)
to authenticated;
