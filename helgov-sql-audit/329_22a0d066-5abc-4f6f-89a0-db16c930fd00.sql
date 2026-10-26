│
◇  Downloading snippet...
-- =========================================================
-- 24 — Empty Day Completion Hardening
-- =========================================================

create or replace function public.is_day_complete(
  target_day_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  required_module_count integer;
  incomplete_module_count integer;
begin
  -- Must be authenticated
  if auth.uid() is null then
    return false;
  end if;

  -- Count required modules in this day.
  select count(*)
  into required_module_count
  from public.modules
  where day_id = target_day_id
    and is_required = true;

  -- An empty day must NEVER be considered completed.
  if required_module_count = 0 then
    return false;
  end if;

  -- Count required modules that are not completed
  -- by the current learner.
  select count(*)
  into incomplete_module_count
  from public.modules m
  where m.day_id = target_day_id
    and m.is_required = true
    and not exists (
      select 1
      from public.learner_module_progress lmp
      where lmp.module_id = m.id
        and lmp.learner_id = auth.uid()
        and lmp.status = 'completed'
    );

  return incomplete_module_count = 0;
end;
$$;

revoke all
on function public.is_day_complete(uuid)
from public;

grant execute
on function public.is_day_complete(uuid)
to authenticated;
