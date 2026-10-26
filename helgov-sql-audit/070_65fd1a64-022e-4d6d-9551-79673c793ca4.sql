│
◇  Downloading snippet...
CREATE OR REPLACE FUNCTION public.set_quiz_manual_completion(
  target_quiz_id uuid,
  target_completed boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid;
  v_module_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF target_completed IS NULL THEN
    RAISE EXCEPTION 'Completion status is required';
  END IF;

  SELECT q.module_id
  INTO v_module_id
  FROM public.quizzes q
  WHERE q.id = target_quiz_id
    AND q.is_published = true
    AND public.can_access_quiz(q.id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz is not available';
  END IF;

  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'This quiz does not belong to a module';
  END IF;

  INSERT INTO public.learner_quiz_progress (
    learner_id,
    quiz_id,
    completed,
    completed_at,
    updated_at
  )
  VALUES (
    v_user_id,
    target_quiz_id,
    target_completed,
    CASE
      WHEN target_completed THEN NOW()
      ELSE NULL
    END,
    NOW()
  )
  ON CONFLICT (learner_id, quiz_id)
  DO UPDATE SET
    completed = EXCLUDED.completed,
    completed_at = EXCLUDED.completed_at,
    updated_at = NOW();

  PERFORM public.recalculate_module_progress(
    v_module_id
  );
END;
$function$;
