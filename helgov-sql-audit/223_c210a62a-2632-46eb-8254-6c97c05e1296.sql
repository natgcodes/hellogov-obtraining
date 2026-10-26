│
◇  Downloading snippet...
-- ============================================================
-- QUERY 122
-- DAY COMPLETION INTEGRITY
-- READ ONLY
-- ============================================================

with enrolled_learners as (
  select
    pe.program_id,
    pe.learner_id
  from public.program_enrollments pe
),

day_requirements as (
  select
    d.id as day_id,
    d.program_id,
    d.day_number,
    d.title as day_title,

    (
      select count(*)
      from public.modules m
      where m.day_id = d.id
        and m.is_published = true
        and m.is_required = true
    ) as required_modules,

    (
      select count(*)
      from public.checkpoints c
      where c.day_id = d.id
        and c.is_required = true
    ) as required_checkpoints

  from public.days d
  where d.is_published = true
),

learner_days as (
  select
    el.program_id,
    el.learner_id,
    dr.day_id,
    dr.day_number,
    dr.day_title,
    dr.required_modules,
    dr.required_checkpoints
  from enrolled_learners el
  join day_requirements dr
    on dr.program_id = el.program_id
)

select
  ld.program_id,
  ld.learner_id,
  ld.day_id,
  ld.day_number,
  ld.day_title,

  ld.required_modules,

  (
    select count(*)
    from public.learner_module_progress lmp
    join public.modules m
      on m.id = lmp.module_id
    where lmp.learner_id = ld.learner_id
      and m.day_id = ld.day_id
      and m.is_published = true
      and m.is_required = true
      and lmp.status = 'completed'
  ) as completed_modules,

  ld.required_checkpoints,

  (
    select count(*)
    from public.checkpoint_results cr
    join public.checkpoints c
      on c.id = cr.checkpoint_id
    where cr.learner_id = ld.learner_id
      and c.day_id = ld.day_id
      and c.is_required = true
      and cr.status = 'completed'
      and cr.passed = true
  ) as passed_checkpoints,

  case
    when
      (
        select count(*)
        from public.learner_module_progress lmp
        join public.modules m
          on m.id = lmp.module_id
        where lmp.learner_id = ld.learner_id
          and m.day_id = ld.day_id
          and m.is_published = true
          and m.is_required = true
          and lmp.status = 'completed'
      ) = ld.required_modules

      and

      (
        select count(*)
        from public.checkpoint_results cr
        join public.checkpoints c
          on c.id = cr.checkpoint_id
        where cr.learner_id = ld.learner_id
          and c.day_id = ld.day_id
          and c.is_required = true
          and cr.status = 'completed'
          and cr.passed = true
      ) = ld.required_checkpoints

    then 'COMPLETE'
    else 'INCOMPLETE'
  end as calculated_day_status

from learner_days ld
order by
  ld.learner_id,
  ld.day_number;
