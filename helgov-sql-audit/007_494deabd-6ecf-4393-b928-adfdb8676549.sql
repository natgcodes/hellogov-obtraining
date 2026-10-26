│
◇  Downloading snippet...
-- ============================================================
-- Query 341: Shared Trainer Progress and Other Roles
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CREATE SHARED PROGRESS FUNCTION
-- Reuse the existing calculation logic.
-- ============================================================

DO $migration$
DECLARE
    original_definition text;
    updated_definition text;
BEGIN
    SELECT pg_get_functiondef(p.oid)
    INTO original_definition
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_trainer_learners'
      AND pg_get_function_identity_arguments(p.oid)
          = 'target_program_id uuid';

    IF original_definition IS NULL THEN
        RAISE EXCEPTION
            'Original get_trainer_learners function not found';
    END IF;

    IF position(
        'AND pr.role = ''learner'''
        IN original_definition
    ) = 0 THEN
        RAISE EXCEPTION
            'Expected learner role filter not found. Migration stopped.';
    END IF;

    updated_definition := replace(
        original_definition,
        'public.get_trainer_learners(target_program_id uuid)',
        'public.get_trainer_all_learners(target_program_id uuid)'
    );

    IF updated_definition = original_definition THEN
        RAISE EXCEPTION
            'Function rename failed. Migration stopped.';
    END IF;

    updated_definition := replace(
        updated_definition,
        'AND pr.role = ''learner''',
        'AND pr.role IN (
            ''learner'',
            ''observer'',
            ''cross_training'',
            ''team_leader''
        )'
    );

    EXECUTE updated_definition;
END;
$migration$;


-- ============================================================
-- 2. PRESERVE TRAINEE-ONLY ROSTER
-- Existing dashboard calculations remain trainee-only.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_trainer_learners(
    target_program_id uuid
)
RETURNS TABLE(
    learner_id uuid,
    full_name text,
    email text,
    enrollment_status text,
    enrolled_at timestamptz,
    started_at timestamptz,
    completed_at timestamptz,
    progress_percent numeric,
    completed_modules bigint,
    total_modules bigint,
    passed_quizzes bigint,
    total_quizzes bigint,
    needs_review bigint,
    completed_checkpoints bigint,
    total_checkpoints bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN

    IF NOT public.is_trainer() THEN
        RAISE EXCEPTION 'Trainer access required';
    END IF;

    RETURN QUERY

    SELECT
        a.learner_id,
        a.full_name,
        a.email,
        a.enrollment_status,
        a.enrolled_at,
        a.started_at,
        a.completed_at,
        a.progress_percent,
        a.completed_modules,
        a.total_modules,
        a.passed_quizzes,
        a.total_quizzes,
        a.needs_review,
        a.completed_checkpoints,
        a.total_checkpoints

    FROM public.get_trainer_all_learners(
        target_program_id
    ) a

    JOIN public.profiles p
        ON p.id = a.learner_id

    WHERE p.role = 'learner';

END;
$function$;


-- ============================================================
-- 3. OTHER ROLES ROSTER
-- Observer, Cross-Training and Team Leader.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_trainer_other_roles(
    target_program_id uuid
)
RETURNS TABLE(
    learner_id uuid,
    full_name text,
    email text,
    user_role text,
    enrollment_status text,
    enrolled_at timestamptz,
    started_at timestamptz,
    completed_at timestamptz,
    progress_percent numeric,
    completed_modules bigint,
    total_modules bigint,
    passed_quizzes bigint,
    total_quizzes bigint,
    needs_review bigint,
    completed_checkpoints bigint,
    total_checkpoints bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN

    IF NOT public.is_trainer() THEN
        RAISE EXCEPTION 'Trainer access required';
    END IF;

    RETURN QUERY

    SELECT
        a.learner_id,
        a.full_name,
        a.email,
        p.role::text,
        a.enrollment_status,
        a.enrolled_at,
        a.started_at,
        a.completed_at,
        a.progress_percent,
        a.completed_modules,
        a.total_modules,
        a.passed_quizzes,
        a.total_quizzes,
        a.needs_review,
        a.completed_checkpoints,
        a.total_checkpoints

    FROM public.get_trainer_all_learners(
        target_program_id
    ) a

    JOIN public.profiles p
        ON p.id = a.learner_id

    WHERE p.role IN (
        'observer',
        'cross_training',
        'team_leader'
    )

    ORDER BY
        a.completed_at DESC NULLS LAST,
        a.started_at DESC NULLS LAST,
        a.full_name;

END;
$function$;


-- ============================================================
-- 4. UPDATE INDIVIDUAL LEARNER SUMMARY
-- Supports all four learning roles.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_trainer_learner_summary(
    target_program_id uuid,
    target_learner_id uuid
)
RETURNS TABLE(
    learner_id uuid,
    full_name text,
    email text,
    enrollment_status text,
    enrolled_at timestamptz,
    started_at timestamptz,
    completed_at timestamptz,
    progress_percent numeric,
    completed_modules bigint,
    total_modules bigint,
    passed_quizzes bigint,
    total_quizzes bigint,
    completed_checkpoints bigint,
    total_checkpoints bigint,
    needs_review bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN

    IF NOT public.is_trainer() THEN
        RAISE EXCEPTION 'Trainer access required';
    END IF;

    RETURN QUERY

    SELECT
        a.learner_id,
        a.full_name,
        a.email,
        a.enrollment_status,
        a.enrolled_at,
        a.started_at,
        a.completed_at,
        a.progress_percent,
        a.completed_modules,
        a.total_modules,
        a.passed_quizzes,
        a.total_quizzes,
        a.completed_checkpoints,
        a.total_checkpoints,
        a.needs_review

    FROM public.get_trainer_all_learners(
        target_program_id
    ) a

    WHERE a.learner_id = target_learner_id;

END;
$function$;


-- ============================================================
-- 5. EXECUTION PERMISSIONS
-- ============================================================

REVOKE ALL ON FUNCTION
    public.get_trainer_all_learners(uuid)
FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION
    public.get_trainer_other_roles(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
    public.get_trainer_all_learners(uuid)
TO authenticated;

GRANT EXECUTE ON FUNCTION
    public.get_trainer_other_roles(uuid)
TO authenticated;

COMMIT;
