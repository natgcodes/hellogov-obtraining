│
◇  Downloading snippet...
-- QUERY 214
-- Create Quiz Attempt Modification Guard

CREATE OR REPLACE FUNCTION public.can_modify_quiz_attempt(
  target_attempt_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$

  SELECT EXISTS (
    SELECT 1
    FROM public.quiz_attempts qa
    WHERE qa.id = target_attempt_id
      AND qa.learner_id = auth.uid()
      AND qa.status = 'in_progress'
      AND public.can_access_quiz(qa.quiz_id)
  );

$function$;

REVOKE ALL ON FUNCTION public.can_modify_quiz_attempt(uuid)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.can_modify_quiz_attempt(uuid)
TO authenticated;
