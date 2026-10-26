│
◇  Downloading snippet...
-- ============================================================
-- QUERY 96
-- Backfill checkpoint_results from existing quiz attempts
--
-- Purpose:
-- Existing checkpoint quiz attempts may predate the trigger that
-- synchronizes quiz_attempts -> checkpoint_results.
--
-- This backfills checkpoint_results using the latest attempt
-- for each learner/checkpoint combination.
-- ============================================================

insert into public.checkpoint_results (
  checkpoint_id,
  learner_id,
  status,
  score,
  passed,
  submitted_at,
  graded_at
)

select
  c.id as checkpoint_id,
  qa.learner_id,

  qa.status,
  qa.score,
  qa.passed,
  qa.submitted_at,
  qa.graded_at

from public.checkpoints c

join lateral (
  select distinct on (attempt.learner_id)
    attempt.learner_id,
    attempt.status,
    attempt.score,
    attempt.passed,
    attempt.submitted_at,
    attempt.graded_at,
    attempt.attempt_number,
    attempt.started_at

  from public.quiz_attempts attempt

  where attempt.quiz_id = c.quiz_id

  order by
    attempt.learner_id,
    attempt.attempt_number desc,
    attempt.started_at desc

) qa on true

where c.quiz_id is not null

on conflict (checkpoint_id, learner_id)

do update set
  status = excluded.status,
  score = excluded.score,
  passed = excluded.passed,
  submitted_at = excluded.submitted_at,
  graded_at = excluded.graded_at;
