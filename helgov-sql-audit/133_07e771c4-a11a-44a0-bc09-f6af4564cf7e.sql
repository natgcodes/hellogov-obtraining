│
◇  Downloading snippet...
-- ============================================================
-- QUERY 196
-- Unlock Next Day After Quiz Submission
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_learner_journey_days(
  target_program_id uuid
)
RETURNS TABLE (
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
      -- The day must contain at least one required item.
      (
        EXISTS (
          SELECT 1
          FROM public.modules m
          WHERE m.day_id = d.id
            AND m.is_required = true
        )

        OR

        EXISTS (
          SELECT 1
          FROM public.checkpoints c
          WHERE c.day_id = d.id
            AND c.is_required = true
        )
      )

      AND

      -- All required modules must be completed.
      NOT EXISTS (
        SELECT 1
        FROM public.modules m
        WHERE m.day_id = d.id
          AND m.is_required = true

          AND NOT EXISTS (
            SELECT 1
            FROM public.learner_module_progress lmp
            WHERE lmp.module_id = m.id
              AND lmp.learner_id = auth.uid()
              AND lmp.status = 'completed'
          )
      )

      AND

      -- All required checkpoints must be completed.
      NOT EXISTS (
        SELECT 1
        FROM public.checkpoints c
        WHERE c.day_id = d.id
          AND c.is_required = true

          AND NOT (
            CASE

              -- ASSESSMENTS:
              -- Require quiz submission, not a passing grade.
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

              -- TRAINER SESSIONS / INFORMATION:
              -- Require checkpoint completion.
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

    LAG(pd.completed) OVER (
      ORDER BY
        pd.position,
        pd.day_number
    ) AS previous_day_completed,

    ROW_NUMBER() OVER (
      ORDER BY
        pd.position,
        pd.day_number
    ) AS day_sequence

  FROM published_days pd
)

SELECT
  od.id,
  od.day_number,
  od.title,

  CASE
    WHEN od.day_sequence = 1
      THEN true

    ELSE COALESCE(
      od.previous_day_completed,
      false
    )
  END AS unlocked,

  od.completed

FROM ordered_days od

WHERE auth.uid() IS NOT NULL

ORDER BY
  od.position,
  od.day_number;

$function$;
