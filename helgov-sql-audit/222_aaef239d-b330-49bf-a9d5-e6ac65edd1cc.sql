│
◇  Downloading snippet...
-- ============================================================
-- QUERY 123
-- REAL DAY COMPLETION FUNCTION AUDIT
-- READ ONLY
-- ============================================================

select
  d.id as day_id,
  d.day_number,
  d.title as day_title,

  (
    select count(*)
    from public.modules m
    where m.day_id = d.id
      and m.is_required = true
  ) as required_modules,

  (
    select count(*)
    from public.checkpoints c
    where c.day_id = d.id
      and c.is_required = true
  ) as required_checkpoints,

  public.is_day_complete(d.id) as actual_is_day_complete,

  case
    when
      (
        (
          select count(*)
          from public.modules m
          where m.day_id = d.id
            and m.is_required = true
        )
        +
        (
          select count(*)
          from public.checkpoints c
          where c.day_id = d.id
            and c.is_required = true
        )
      ) = 0
      then 'EMPTY DAY'

    when public.is_day_complete(d.id) = true
      then 'COMPLETE'

    else 'INCOMPLETE'
  end as audit_status

from public.days d
where d.is_published = true

order by d.day_number;
