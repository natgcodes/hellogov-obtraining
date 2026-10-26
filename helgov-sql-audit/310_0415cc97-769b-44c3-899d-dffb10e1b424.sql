│
◇  Downloading snippet...
select
  tc.constraint_name,
  tc.constraint_type,
  kcu.table_name,
  kcu.column_name,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
  and tc.constraint_schema = kcu.constraint_schema
left join information_schema.constraint_column_usage ccu
  on tc.constraint_name = ccu.constraint_name
  and tc.constraint_schema = ccu.constraint_schema
where tc.constraint_schema = 'public'
  and (
    (kcu.table_name = 'checkpoints' and kcu.column_name = 'quiz_id')
    or
    (kcu.table_name = 'checkpoint_results')
  )
order by kcu.table_name, tc.constraint_type, tc.constraint_name;
