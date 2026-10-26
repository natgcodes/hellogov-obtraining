│
◇  Downloading snippet...
insert into public.program_enrollments (
  program_id,
  learner_id,
  status
)
select
  '5f5a6ef1-3133-45f6-b421-0dc09ea4a6a0'::uuid,
  p.id,
  'not_started'
from public.profiles p
where p.role = 'learner'
  and p.id in (
    '65fb416f-33d8-4587-8b6d-154da9ef9584',
    '023c786f-8311-4a71-8b8c-c1d0efed324a',
    '40899cd1-8451-47d8-a256-3fcbfc99f869',
    '8f033a48-433f-4ac7-8698-04e32d091903',
    'cd16cc3b-43d4-4f35-a239-dbdf019c559a',
    '279d9ed2-8bc0-4afc-b547-79eac28b5061'
  )
  and not exists (
    select 1
    from public.program_enrollments pe
    where pe.program_id =
      '5f5a6ef1-3133-45f6-b421-0dc09ea4a6a0'::uuid
      and pe.learner_id = p.id
  )
returning
  learner_id,
  status,
  enrolled_at;
