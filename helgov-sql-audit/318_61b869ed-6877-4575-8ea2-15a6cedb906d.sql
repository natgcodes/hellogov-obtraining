│
◇  Downloading snippet...
-- ============================================================
-- 35 — Universal Trainer Grade Override
-- ============================================================
--
-- Allows trainers to grade or override the grade of ANY
-- submitted quiz answer.
--
-- IMPORTANT:
-- - Does NOT modify the learner's original answer.
-- - Only modifies grading information:
--     points_awarded
--     trainer_feedback
--     is_correct
--     graded_at
-- ============================================================

create or replace function public.grade_manual_quiz_answer(
  target_answer_id uuid,
  awarded_points numeric,
  feedback text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_question_max_points numeric;
  v_attempt_submitted_at timestamptz;
begin

  -- ----------------------------------------------------------
  -- SECURITY
  -- ----------------------------------------------------------

  if not public.is_trainer() then
    raise exception 'Trainer access required';
  end if;

  -- ----------------------------------------------------------
  -- ANSWER + QUESTION + ATTEMPT VALIDATION
  -- ----------------------------------------------------------

  select
    qq.points,
    qat.submitted_at
  into
    v_question_max_points,
    v_attempt_submitted_at
  from public.quiz_answers qa
  join public.quiz_questions qq
    on qq.id = qa.question_id
  join public.quiz_attempts qat
    on qat.id = qa.attempt_id
  where qa.id = target_answer_id;

  if v_question_max_points is null then
    raise exception 'Quiz answer not found';
  end if;

  -- Trainer should never grade an active attempt.
  if v_attempt_submitted_at is null then
    raise exception 'Quiz attempt has not been submitted';
  end if;

  -- ----------------------------------------------------------
  -- POINT VALIDATION
  -- ----------------------------------------------------------

  if awarded_points is null then
    raise exception 'Awarded points are required';
  end if;

  if awarded_points < 0
     or awarded_points > v_question_max_points
  then
    raise exception
      'Awarded points must be between 0 and %',
      v_question_max_points;
  end if;

  -- ----------------------------------------------------------
  -- GRADE / OVERRIDE
  -- ----------------------------------------------------------

  update public.quiz_answers qa
  set
    points_awarded = awarded_points,

    trainer_feedback =
      nullif(trim(feedback), ''),

    is_correct =
      (awarded_points = v_question_max_points),

    graded_at = now()
  where qa.id = target_answer_id;

end;
$function$;


revoke all
on function public.grade_manual_quiz_answer(
  uuid,
  numeric,
  text
)
from public;


grant execute
on function public.grade_manual_quiz_answer(
  uuid,
  numeric,
  text
)
to authenticated;
