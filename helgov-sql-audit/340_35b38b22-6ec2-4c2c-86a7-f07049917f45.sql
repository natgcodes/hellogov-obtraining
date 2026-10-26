│
◇  Downloading snippet...
select
  'setup_items' as source,
  count(*) as records
from public.setup_items

union all

select
  'certifications',
  count(*)
from public.certifications

union all

select
  'certification_components',
  count(*)
from public.certification_components

union all

select
  'post_training',
  count(*)
from public.post_training

union all

select
  'post_training_stages',
  count(*)
from public.post_training_stages;
