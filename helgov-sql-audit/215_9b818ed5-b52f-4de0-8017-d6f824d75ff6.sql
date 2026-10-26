│
◇  Downloading snippet...
-- ============================================================
-- QUERY 130
-- MODULE PROGRESS CONSISTENCY AUDIT
-- READ ONLY
-- ============================================================

select
  lmp.learner_id,
  lmp.module_id,
  m.day_id,
  d.day_number,
  d.title as day_title,
  m.title as module_title,
  m.is_required,
  lmp.status as stored_module_status,

  case
    when lmp.status = 'completed'
      then 'COMPLETED'
    when lmp.status = 'in_progress'
      then 'IN PROGRESS'
    when lmp.status = 'not_started'
      then 'NOT STARTED'
    else 'CHECK UNKNOWN STATUS'
  end as normalized_status,

  case
    when lmp.status in (
      'completed',
      'in_progress',
      'not_started'
    )
      then 'OK'
    else 'CHECK'
  end as integrity_status

from public.learner_module_progress lmp

join public.modules m
  on m.id = lmp.module_id

join public.days d
  on d.id = m.day_id

order by
  lmp.learner_id,
  d.day_number,
  m.title;
