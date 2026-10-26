│
◇  Downloading snippet...
CREATE OR REPLACE FUNCTION public.get_learner_day_progress(
  target_day_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  current_user_id uuid;
  result jsonb;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT jsonb_build_object(
    'modules',
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'module_id', m.id,
          'status', lmp.status
        )
      )
      FROM public.modules m
      JOIN public.learner_module_progress lmp
        ON lmp.module_id = m.id
       AND lmp.learner_id = current_user_id
      WHERE m.day_id = target_day_id
    ), '[]'::jsonb),

    'materials',
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'material_id', mat.id,
          'completed', lmp.completed
        )
      )
      FROM public.modules m
      JOIN public.materials mat
        ON mat.module_id = m.id
      JOIN public.learner_material_progress lmp
        ON lmp.material_id = mat.id
       AND lmp.learner_id = current_user_id
      WHERE m.day_id = target_day_id
    ), '[]'::jsonb),

    'activities',
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'activity_id', a.id,
          'status', lap.status
        )
      )
      FROM public.modules m
      JOIN public.activities a
        ON a.module_id = m.id
      JOIN public.learner_activity_progress lap
        ON lap.activity_id = a.id
       AND lap.learner_id = current_user_id
      WHERE m.day_id = target_day_id
    ), '[]'::jsonb),

    'quizzes',
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'quiz_id', q.id,

          'manually_completed',
          EXISTS (
            SELECT 1
            FROM public.learner_quiz_progress lqp
            WHERE lqp.quiz_id = q.id
              AND lqp.learner_id = current_user_id
              AND lqp.completed = true
          ),

          'completed',
          (
            EXISTS (
              SELECT 1
              FROM public.learner_quiz_progress lqp
              WHERE lqp.quiz_id = q.id
                AND lqp.learner_id = current_user_id
                AND lqp.completed = true
            )
            OR EXISTS (
              SELECT 1
              FROM public.quiz_attempts qa
              WHERE qa.quiz_id = q.id
                AND qa.learner_id = current_user_id
                AND qa.status = 'graded'
                AND qa.passed = true
            )
          )
        )
      )
      FROM public.modules m
      JOIN public.quizzes q
        ON q.module_id = m.id
      WHERE m.day_id = target_day_id
        AND q.is_published = true
    ), '[]'::jsonb),

    'checkpoints',
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'checkpoint_id', c.id,
          'status', cr.status,
          'score', cr.score,
          'passed', cr.passed,
          'trainer_feedback', cr.trainer_feedback,
          'submitted_at', cr.submitted_at,
          'graded_at', cr.graded_at
        )
      )
      FROM public.checkpoints c
      JOIN public.checkpoint_results cr
        ON cr.checkpoint_id = c.id
       AND cr.learner_id = current_user_id
      WHERE c.day_id = target_day_id
    ), '[]'::jsonb)
  )
  INTO result;

  RETURN result;
END;
$function$;
