│
◇  Downloading snippet...
-- ============================================================
-- QUERY 124
-- PROGRAM ENROLLMENT INTEGRITY AUDIT
-- READ ONLY
-- ============================================================

select
  pe.id as enrollment_id,
  pe.program_id,
  pe.learner_id,
  pe.status as stored_program_status,
  pe.progress_percent as stored_progress_percent,

  (
    select count(*)
    from public.days d
    where d.program_id = pe.program_id
      and d.is_published = true
  ) as published_days,

  (
    select count(*)
    from public.days d
    where d.program_id = pe.program_id
      and d.is_published = true
      and public.is_day_complete(d.id) = true
  ) as completed_days,

  case
    when pe.status = 'completed'
      and exists (
        select 1
        from public.days d
        where d.program_id = pe.program_id
          and d.is_published = true
          and public.is_day_complete(d.id) = false
      )
      then 'ERROR - PROGRAM COMPLETED WITH INCOMPLETE DAYS'

    when pe.status <> 'completed'
      and not exists (
        select 1
        from public.days d
        where d.program_id = pe.program_id
          and d.is_published = true
          and public.is_day_complete(d.id) = false
      )
      then 'CHECK - ALL DAYS COMPLETE BUT PROGRAM NOT COMPLETED'

    else 'OK'
  end as integrity_status

from public.program_enrollments pe

order by pe.created_at;
