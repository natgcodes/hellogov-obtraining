│
◇  Downloading snippet...
-- =========================================================
-- 23 — Remove Duplicate Empty Program
-- =========================================================

do $$
declare
  duplicate_program_id uuid := '0bfded66-aee5-4103-8cbe-92363bd2ef57';
  real_program_id uuid := '5f5a6ef1-3133-45f6-b421-0dc09ea4a6a0';
begin

  -- Safety check:
  -- Never delete the duplicate if it unexpectedly has training days.
  if exists (
    select 1
    from public.days
    where program_id = duplicate_program_id
  ) then
    raise exception
      'Safety stop: duplicate program contains training days and was not deleted.';
  end if;

  -- Remove the empty duplicate program.
  delete from public.programs
  where id = duplicate_program_id;

  -- Make sure the real onboarding program is published.
  update public.programs
  set
    status = 'published',
    updated_at = now()
  where id = real_program_id;

  -- Publish all training days belonging to the real program.
  update public.days
  set
    is_published = true,
    updated_at = now()
  where program_id = real_program_id;

end;
$$;
