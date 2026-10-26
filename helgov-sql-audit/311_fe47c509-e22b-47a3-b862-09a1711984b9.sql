│
◇  Downloading snippet...
select
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and (
    table_name ilike '%checkpoint%'
    or table_name ilike '%quiz_attempt%'
    or table_name ilike '%quiz_answer%'
  )
order by table_name, ordinal_position;
