│
◇  Downloading snippet...
-- ============================================================
-- QUERY 133
-- REQUIRED CONTENT & PROGRESS COVERAGE AUDIT
-- READ ONLY
-- ============================================================

with program_required as (
  select
    pe.program_id,
    pe.learner_id,

    (
      select count(*)
      from public.setup_items si
      where si.program_id = pe.program_id
        and si.is_required = true
    ) as required_setup_items,

    (
      select count(*)
      from public.modules m
      join public.days d
        on d.id = m.day_id
      where d.program_id = pe.program_id
        and d.is_published = true
        and m.is_required = true
    ) as required_modules,

    (
      select count(*)
      from public.checkpoints c
      join public.days d
        on d.id = c.day_id
      where d.program_id = pe.program_id
        and d.is_published = true
        and c.is_required = true
    ) as required_checkpoints,

    (
      select count(*)
      from public.setup_items si
      join public.learner_setup_progress lsp
        on lsp.setup_item_id = si.id
      where si.program_id = pe.program_id
        and si.is_required = true
        and lsp.learner_id = pe.learner_id
        and lsp.completed = true
    ) as completed_setup_items,

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
    ) as completed_modules,

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
    ) as passed_checkpoints

  from public.program_enrollments pe
)

select
  program_id,
  learner_id,

  required_setup_items,
  completed_setup_items,

  required_modules,
  completed_modules,

  required_checkpoints,
  passed_checkpoints,

  (
    required_setup_items
    + required_modules
    + required_checkpoints
  ) as total_required,

  (
    completed_setup_items
    + completed_modules
    + passed_checkpoints
  ) as total_completed,

  case
    when
      completed_setup_items <= required_setup_items
      and completed_modules <= required_modules
      and passed_checkpoints <= required_checkpoints
    then 'OK'
    else 'ERROR - COMPLETED COUNT EXCEEDS REQUIRED COUNT'
  end as integrity_status

from program_required;
