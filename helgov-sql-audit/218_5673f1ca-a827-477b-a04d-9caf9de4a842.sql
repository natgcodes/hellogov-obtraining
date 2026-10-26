│
◇  Downloading snippet...
-- ============================================================
-- QUERY 127
-- COMPARE PROGRAM PROGRESS CALCULATION PATHS
-- READ ONLY
-- ============================================================

with enrollment_audit as (
  select
    pe.program_id,
    pe.learner_id,
    pe.status as stored_status,

    public.get_program_progress(pe.program_id)
      as one_arg_progress,

    (
      select count(*)
      from public.setup_items si
      where si.program_id = pe.program_id
        and si.is_required = true
    )
    +
    (
      select count(*)
      from public.modules m
      join public.days d
        on d.id = m.day_id
      where d.program_id = pe.program_id
        and d.is_published = true
        and m.is_required = true
    )
    +
    (
      select count(*)
      from public.checkpoints c
      join public.days d
        on d.id = c.day_id
      where d.program_id = pe.program_id
        and d.is_published = true
        and c.is_required = true
    )
      as two_arg_total_items,

    (
      select count(*)
      from public.setup_items si
      join public.learner_setup_progress lsp
        on lsp.setup_item_id = si.id
      where si.program_id = pe.program_id
        and si.is_required = true
        and lsp.learner_id = pe.learner_id
        and lsp.completed = true
    )
    +
    (
      select count(*)
      from public.learner_module_progress lmp
      join public.modules m
        on m.id = lmp.module_id
      join public.days d
        on d.id = m.day_id
      where d.program_id = pe.program_id
        and d.is_published = true
        and m.is_required = true
        and lmp.learner_id = pe.learner_id
        and lmp.status = 'completed'
    )
    +
    (
      select count(*)
      from public.checkpoint_results cr
      join public.checkpoints c
        on c.id = cr.checkpoint_id
      join public.days d
        on d.id = c.day_id
      where d.program_id = pe.program_id
        and d.is_published = true
        and c.is_required = true
        and cr.learner_id = pe.learner_id
        and cr.status = 'completed'
        and cr.passed = true
    )
      as two_arg_completed_items

  from public.program_enrollments pe
)

select
  program_id,
  learner_id,
  stored_status,
  one_arg_progress,
  two_arg_total_items,
  two_arg_completed_items,

  case
    when two_arg_total_items > 0
    then round(
      two_arg_completed_items::numeric
      / two_arg_total_items::numeric
      * 100,
      2
    )
    else 0
  end as two_arg_progress,

  case
    when two_arg_total_items > 0
         and two_arg_completed_items >= two_arg_total_items
      then 'completed'
    when two_arg_completed_items > 0
      then 'in_progress'
    else 'not_started'
  end as two_arg_calculated_status

from enrollment_audit;
