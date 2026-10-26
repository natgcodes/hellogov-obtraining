│
◇  Downloading snippet...
-- ============================================================
-- 19 - INSPECT LEARNER PROGRESS SCHEMA
-- ============================================================

select
  table_name,
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'program_enrollments',
    'learner_setup_progress',
    'learner_module_progress',
    'learner_material_progress',
    'learner_activity_progress',
    'certification_results',
    'certification_component_results'
  )
order by table_name, ordinal_position;
