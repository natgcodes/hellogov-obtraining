│
◇  Downloading snippet...
CREATE OR REPLACE FUNCTION public.get_learner_journey_days(
  target_program_id uuid
)
RETURNS TABLE(
  id uuid,
  day_number integer,
  title text,
  unlocked boolean,
  completed boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$

  WITH published_days AS (
    SELECT
      d.id,
      d.day_number,
      d.title,
      d.position,

      (
        (
          EXISTS (
            SELECT 1
            FROM public.modules m
            WHERE m.day_id = d.id
              AND m.is_required = true
              AND m.publication_status <> 'draft'
          )
          OR EXISTS (
            SELECT 1
            FROM public.checkpoints c
            WHERE c.day_id = d.id
              AND c.is_required = true
          )
        )

        AND NOT EXISTS (
          SELECT 1
          FROM public.modules m
          WHERE m.day_id = d.id
            AND m.is_required = true
            AND m.publication_status <> 'draft'
            AND (
              m.publication_status = 'locked'
              OR NOT EXISTS (
                SELECT 1
                FROM public.learner_module_progress lmp
                WHERE lmp.module_id = m.id
                  AND lmp.learner_id = auth.uid()
                  AND lmp.status = 'completed'
              )
            )
        )

        AND NOT EXISTS (
          SELECT 1
          FROM public.checkpoints c
          WHERE c.day_id = d.id
            AND c.is_required = true
            AND NOT (
              CASE
                WHEN c.checkpoint_type = 'assessment'
                THEN EXISTS (
                  SELECT 1
                  FROM public.quiz_attempts qa
                  WHERE qa.quiz_id = c.quiz_id
                    AND qa.learner_id = auth.uid()
                    AND qa.submitted_at IS NOT NULL
                    AND qa.status IN (
                      'submitted',
                      'needs_review',
                      'graded',
                      'completed'
                    )
                )

                WHEN c.checkpoint_type IN (
                  'trainer_session',
                  'information'
                )
                THEN EXISTS (
                  SELECT 1
                  FROM public.checkpoint_results cr
                  WHERE cr.checkpoint_id = c.id
                    AND cr.learner_id = auth.uid()
                    AND cr.status = 'completed'
                )

                ELSE false
              END
            )
        )
      ) AS completed

    FROM public.days d
    WHERE d.program_id = target_program_id
      AND d.is_published = true
  ),

  ordered_days AS (
    SELECT
      pd.*,

      ROW_NUMBER() OVER (
        ORDER BY pd.position, pd.day_number
      ) AS day_sequence,

      COUNT(*) FILTER (
        WHERE pd.completed = false
      ) OVER (
        ORDER BY pd.position, pd.day_number
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ) AS incomplete_previous_days

    FROM published_days pd
  )

  SELECT
    od.id,
    od.day_number,
    od.title,

    (
      od.day_sequence = 1

      -- EMERGENCY ACCESS: DAY 2 ALWAYS UNLOCKED
      OR od.day_number = 2

      -- NORMAL UNLOCK RULE FOR OTHER DAYS
      OR od.incomplete_previous_days = 0
    ) AS unlocked,

    od.completed

  FROM ordered_days od
  WHERE auth.uid() IS NOT NULL
  ORDER BY od.position, od.day_number;

$function$;
