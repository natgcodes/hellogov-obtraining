│
◇  Downloading snippet...
create policy "Trainers can update trainee profiles"
on public.profiles
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles trainer_profile
    where trainer_profile.id = auth.uid()
      and trainer_profile.role = 'trainer'
  )
)
with check (
  exists (
    select 1
    from public.profiles trainer_profile
    where trainer_profile.id = auth.uid()
      and trainer_profile.role = 'trainer'
  )
);
