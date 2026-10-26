│
◇  Downloading snippet...
select
  table_name,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'days',
    'modules',
    'materials',
    'activities',
    'quizzes',
    'checkpoints'
  )
order by
  table_name,
  ordinal_position;
