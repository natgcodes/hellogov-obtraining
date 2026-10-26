│
◇  Downloading snippet...
-- =========================================================
-- 22 — Program Publishing Hardening
-- =========================================================

create or replace function public.set_program_status(
  target_program_id uuid,
  new_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only trainers can change program publication status
  if not public.is_trainer() then
    raise exception 'Only trainers can change program status.';
  end if;

  -- Validate requested status
  if new_status not in ('draft', 'published') then
    raise exception 'Invalid program status. Expected draft or published.';
  end if;

  -- Make sure the program exists
  if not exists (
    select 1
    from public.programs
    where id = target_program_id
  ) then
    raise exception 'Program not found.';
  end if;

  -- Update the program itself
  update public.programs
  set
    status = new_status,
    updated_at = now()
  where id = target_program_id;

  -- Publishing the full program also publishes its training days.
  -- Returning the program to draft intentionally DOES NOT unpublish
  -- individual days, because the program itself already blocks learner access.
  if new_status = 'published' then
    update public.days
    set
      is_published = true,
      updated_at = now()
    where program_id = target_program_id;
  end if;
end;
$$;

revoke all on function public.set_program_status(uuid, text) from public;
grant execute on function public.set_program_status(uuid, text) to authenticated;
