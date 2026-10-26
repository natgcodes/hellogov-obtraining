│
◇  Downloading snippet...
-- ============================================================
-- QUERY 93
-- Verify trainer learner assessments
--
-- Diagnostic only.
-- Does not modify any data.
-- ============================================================

select *
from public.get_trainer_learner_assessments(
  (
    select pe.program_id
    from public.program_enrollments pe
    join public.profiles p
      on p.id = pe.learner_id
    where p.email = 'learner@test.com'
    limit 1
  ),
  (
    select id
    from public.profiles
    where email = 'learner@test.com'
    limit 1
  )
);
