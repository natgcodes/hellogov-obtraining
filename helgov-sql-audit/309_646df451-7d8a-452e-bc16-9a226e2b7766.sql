│
◇  Downloading snippet...
select
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name as referenced_table,
  ccu.column_name as referenced_column,
  rc.update_rule,
  rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
  and tc.constraint_schema = kcu.constraint_schema
join information_schema.referential_constraints rc
  on tc.constraint_name = rc.constraint_name
  and tc.constraint_schema = rc.constraint_schema
join information_schema.constraint_column_usage ccu
  on rc.unique_constraint_name = ccu.constraint_name
  and rc.unique_constraint_schema = ccu.constraint_schema
where tc.constraint_schema = 'public'
  and tc.constraint_name in (
    'checkpoints_quiz_id_fkey',
    'checkpoint_results_checkpoint_id_fkey',
    'checkpoint_results_learner_id_fkey'
  )
order by tc.constraint_name;
