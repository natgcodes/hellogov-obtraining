│
◇  Downloading snippet...
insert into public.days (
  program_id,
  day_number,
  title,
  description,
  position,
  is_published
)
select
  p.id,
  1,
  'Passport Service Foundations',
  'Understand HelloGov''s passport service, terminology, requirements and process before moving into customer operations.',
  1,
  false
from public.programs as p
where p.title = 'Customer Support Onboarding'
order by p.created_at asc
limit 1
returning
  id,
  day_number,
  title,
  position,
  is_published;
