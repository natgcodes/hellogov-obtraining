│
◇  Downloading snippet...
-- QUERY 215
-- Protect File Upload Answers

CREATE OR REPLACE FUNCTION public.save_file_answer(
  target_attempt_id uuid,
  target_question_id uuid,
  target_file_path text,
  target_file_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_answer_id uuid;
BEGIN

  -- NEW: Verify that the attempt is still accessible.
  IF NOT public.can_modify_quiz_attempt(target_attempt_id) THEN
    RAISE EXCEPTION 'Quiz attempt is not available';
  END IF;

  -- Original validation.
  IF NOT EXISTS (
    SELECT 1
    FROM public.quiz_attempts qa
    JOIN public.quiz_questions qq
      ON qq.quiz_id = qa.quiz_id
    WHERE qa.id = target_attempt_id
      AND qa.learner_id = auth.uid()
      AND qa.status = 'in_progress'
      AND qq.id = target_question_id
      AND qq.question_type = 'file_upload'
  ) THEN
    RAISE EXCEPTION 'Invalid attempt or question';
  END IF;

  SELECT qa.id
  INTO v_answer_id
  FROM public.quiz_answers qa
  WHERE qa.attempt_id = target_attempt_id
    AND qa.question_id = target_question_id
  LIMIT 1;

  IF v_answer_id IS NULL THEN

    INSERT INTO public.quiz_answers (
      attempt_id,
      question_id,
      file_path,
      file_name
    )
    VALUES (
      target_attempt_id,
      target_question_id,
      target_file_path,
      target_file_name
    )
    RETURNING id INTO v_answer_id;

  ELSE

    UPDATE public.quiz_answers qa
    SET
      file_path = target_file_path,
      file_name = target_file_name,
      is_correct = NULL,
      points_awarded = NULL,
      trainer_feedback = NULL,
      graded_at = NULL
    WHERE qa.id = v_answer_id;

  END IF;

  RETURN v_answer_id;

END;
$function$;
