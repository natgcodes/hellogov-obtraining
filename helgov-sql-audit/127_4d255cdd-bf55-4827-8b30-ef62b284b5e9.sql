│
◇  Downloading snippet...
-- ============================================================
-- QUERY 202 — TRAINER NOTES WORKSPACE
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. TRAINING LEAD MEMBERSHIP
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.training_leads (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Identify the designated Training Lead.
-- This account must already exist in Supabase Auth.

INSERT INTO public.training_leads (user_id)
SELECT id
FROM auth.users
WHERE lower(email) = 'natalia.gruber@ivisa.com'
ON CONFLICT (user_id) DO NOTHING;


-- ------------------------------------------------------------
-- 2. TRAINER NOTES
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.trainer_workspace_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  author_id uuid NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,

  category text NOT NULL
    CHECK (
      category IN (
        'general',
        'session',
        'idea',
        'follow_up',
        'observation',
        'lead_request'
      )
    ),

  title text NOT NULL,
  content text NOT NULL,

  trainee_id uuid NULL
    REFERENCES auth.users(id) ON DELETE SET NULL,

  observation_type text NULL
    CHECK (
      observation_type IS NULL
      OR observation_type IN (
        'positive',
        'improvement',
        'general'
      )
    ),

  status text NOT NULL DEFAULT 'open'
    CHECK (
      status IN (
        'open',
        'in_progress',
        'resolved'
      )
    ),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT trainer_notes_title_not_blank
    CHECK (length(btrim(title)) > 0),

  CONSTRAINT trainer_notes_content_not_blank
    CHECK (length(btrim(content)) > 0)
);


-- ------------------------------------------------------------
-- 3. REQUEST REPLIES
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.trainer_workspace_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  note_id uuid NOT NULL
    REFERENCES public.trainer_workspace_notes(id)
    ON DELETE CASCADE,

  author_id uuid NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,

  content text NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT trainer_reply_not_blank
    CHECK (length(btrim(content)) > 0)
);


-- ------------------------------------------------------------
-- 4. UPDATED_AT
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.touch_trainer_workspace_note()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS
  trg_touch_trainer_workspace_note
ON public.trainer_workspace_notes;

CREATE TRIGGER trg_touch_trainer_workspace_note
BEFORE UPDATE ON public.trainer_workspace_notes
FOR EACH ROW
EXECUTE FUNCTION public.touch_trainer_workspace_note();


-- ------------------------------------------------------------
-- 5. HELPER: IS TRAINING LEAD
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_training_lead()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.training_leads tl
    WHERE tl.user_id = (SELECT auth.uid())
  )
  AND public.is_trainer();
$$;


-- ------------------------------------------------------------
-- 6. RLS
-- ------------------------------------------------------------

ALTER TABLE public.training_leads
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.trainer_workspace_notes
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.trainer_workspace_replies
ENABLE ROW LEVEL SECURITY;


-- Training leads: trainers can read membership.

DROP POLICY IF EXISTS
  "Trainers read training leads"
ON public.training_leads;

CREATE POLICY "Trainers read training leads"
ON public.training_leads
FOR SELECT
TO authenticated
USING (public.is_trainer());


-- Notes: all trainers can read.

DROP POLICY IF EXISTS
  "Trainers read workspace notes"
ON public.trainer_workspace_notes;

CREATE POLICY "Trainers read workspace notes"
ON public.trainer_workspace_notes
FOR SELECT
TO authenticated
USING (public.is_trainer());


-- Notes: trainers can create their own notes.

DROP POLICY IF EXISTS
  "Trainers create workspace notes"
ON public.trainer_workspace_notes;

CREATE POLICY "Trainers create workspace notes"
ON public.trainer_workspace_notes
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_trainer()
  AND author_id = (SELECT auth.uid())
);


-- Notes: author or Training Lead can update.

DROP POLICY IF EXISTS
  "Authors and leads update workspace notes"
ON public.trainer_workspace_notes;

CREATE POLICY "Authors and leads update workspace notes"
ON public.trainer_workspace_notes
FOR UPDATE
TO authenticated
USING (
  public.is_trainer()
  AND (
    author_id = (SELECT auth.uid())
    OR public.is_training_lead()
  )
)
WITH CHECK (
  public.is_trainer()
  AND (
    author_id = (SELECT auth.uid())
    OR public.is_training_lead()
  )
);


-- Notes: author or Training Lead can delete.

DROP POLICY IF EXISTS
  "Authors and leads delete workspace notes"
ON public.trainer_workspace_notes;

CREATE POLICY "Authors and leads delete workspace notes"
ON public.trainer_workspace_notes
FOR DELETE
TO authenticated
USING (
  public.is_trainer()
  AND (
    author_id = (SELECT auth.uid())
    OR public.is_training_lead()
  )
);


-- Replies: shared across trainers.

DROP POLICY IF EXISTS
  "Trainers read workspace replies"
ON public.trainer_workspace_replies;

CREATE POLICY "Trainers read workspace replies"
ON public.trainer_workspace_replies
FOR SELECT
TO authenticated
USING (public.is_trainer());


-- Only Training Lead can respond to requests.

DROP POLICY IF EXISTS
  "Training leads create replies"
ON public.trainer_workspace_replies;

CREATE POLICY "Training leads create replies"
ON public.trainer_workspace_replies
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_training_lead()
  AND author_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.trainer_workspace_notes n
    WHERE n.id = note_id
      AND n.category = 'lead_request'
  )
);


-- ------------------------------------------------------------
-- 7. DATABASE-LEVEL INTEGRITY GUARDS
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_trainer_workspace_note()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Do not allow changing the original author.
  IF TG_OP = 'UPDATE'
     AND NEW.author_id IS DISTINCT FROM OLD.author_id
  THEN
    RAISE EXCEPTION 'Note author cannot be changed';
  END IF;

  -- Trainee references must point to learner profiles.
  IF NEW.trainee_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.profiles p
       WHERE p.id = NEW.trainee_id
         AND p.role = 'learner'
     )
  THEN
    RAISE EXCEPTION 'Invalid trainee';
  END IF;

  -- Only the Training Lead can change request status.
  IF TG_OP = 'UPDATE'
     AND OLD.category = 'lead_request'
     AND NEW.status IS DISTINCT FROM OLD.status
     AND NOT public.is_training_lead()
  THEN
    RAISE EXCEPTION 'Only Training Lead can change request status';
  END IF;

  -- A regular trainer cannot convert an existing request
  -- into another category to bypass the status restriction.
  IF TG_OP = 'UPDATE'
     AND OLD.category = 'lead_request'
     AND NEW.category IS DISTINCT FROM OLD.category
     AND NOT public.is_training_lead()
  THEN
    RAISE EXCEPTION 'Only Training Lead can change request category';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS
  trg_validate_trainer_workspace_note
ON public.trainer_workspace_notes;

CREATE TRIGGER trg_validate_trainer_workspace_note
BEFORE INSERT OR UPDATE
ON public.trainer_workspace_notes
FOR EACH ROW
EXECUTE FUNCTION public.validate_trainer_workspace_note();


-- ------------------------------------------------------------
-- 8. PERMISSIONS
-- ------------------------------------------------------------

GRANT SELECT
ON public.training_leads
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.trainer_workspace_notes
TO authenticated;

GRANT SELECT, INSERT
ON public.trainer_workspace_replies
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.is_training_lead()
TO authenticated;

COMMIT;
