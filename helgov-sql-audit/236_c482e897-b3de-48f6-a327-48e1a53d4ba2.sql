│
◇  Downloading snippet...
-- ============================================================
-- QUERY 109
-- FIX finalize_checkpoint_quiz_review RETURN STATUS
--
-- checkpoint_status must use the checkpoint_results vocabulary:
-- pending / completed / needs_review
-- ============================================================

do $$
declare
  v_definition text;
begin

  select pg_get_functiondef(p.oid)
  into v_definition
  from pg_proc p
  join pg_namespace n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'finalize_checkpoint_quiz_review'
    and pg_get_function_identity_arguments(p.oid)
        = 'target_attempt_id uuid';

  if v_definition is null then
    raise exception
      'Function public.finalize_checkpoint_quiz_review(uuid) not found';
  end if;

  -- Replace only the RETURN QUERY block's checkpoint status.
  v_definition := replace(
    v_definition,
    $old$
    'graded'::text,
    'graded'::text,
    coalesce(
      v_program_status,
      'not_started'
    )
$old$,
    $new$
    'graded'::text,
    'completed'::text,
    coalesce(
      v_program_status,
      'not_started'
    )
$new$
  );

  execute v_definition;

end;
$$;
