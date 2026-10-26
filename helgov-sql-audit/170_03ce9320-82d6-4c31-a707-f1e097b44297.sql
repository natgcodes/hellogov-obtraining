│
◇  Downloading snippet...
select
  p.id,
  p.full_name,
  p.email,
  p.role,
  pe.program_id,
  pe.status as enrollment_status
from public.profiles p
left join public.program_enrollments pe
  on pe.learner_id = p.id
  and pe.program_id = '5f5a6ef1-3133-45f6-b421-0dc09ea4a6a0'
where p.role = 'learner'
order by p.full_name;
