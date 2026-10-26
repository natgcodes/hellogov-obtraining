│
◇  Downloading snippet...
select
  tc.table_name,
  kcu.column_name,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
  and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
  and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
  and (
    tc.table_name like 'learner_%'
    or tc.table_name in (
      'program_enrollments',
      'quiz_attempts',
      'quiz_answers',
      'quiz_answer_options',
      'quiz_answer_matches',
      'checkpoint_results',
      'certification_results',
      'certification_component_results'
    )
  )
order by tc.table_name, kcu.column_name;
