│
◇  Downloading snippet...
-- ============================================================
-- QUERY 129
-- AUTH IDENTITY VS ENROLLED LEARNER AUDIT
-- READ ONLY
-- ============================================================

select
  auth.uid() as current_auth_uid,
  pe.learner_id as enrolled_learner_id,

  case
    when auth.uid() is null
      then 'NO AUTH UID'

    when auth.uid() = pe.learner_id
      then 'MATCH'

    else 'DIFFERENT USER'
  end as identity_status,

  pe.status as enrollment_status

from public.program_enrollments pe;
