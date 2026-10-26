│
◇  Downloading snippet...
-- ============================================================
-- QUERY 116
-- FIX MANUAL CHECKPOINT SUBMISSION + GRADING STATUSES
--
-- checkpoint_results valid statuses:
--   pending
--   completed
--   needs_review
-- ============================================================


-- ============================================================
-- 1. SUBMIT CHECKPOINT
-- submitted -> pending
-- ============================================================

create or replace function public.submit_checkpoint(
  target_checkpoint_id uuid
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin

  -- ----------------------------------------------------------
  -- AUTHENTICATION
  -- ----------------------------------------------------------

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;


  -- ----------------------------------------------------------
  -- CHECKPOINT AVAILABILITY
  -- ----------------------------------------------------------

  if not exists (
    select 1
    from public.checkpoints c
    join public.days d
      on d.id = c.day_id
    join public.programs p
      on p.id = d.program_id
    where c.id = target_checkpoint_id
      and d.is_published = true
      and p.status = 'published'
  ) then
    raise exception 'Checkpoint is not available';
  end if;


  -- ----------------------------------------------------------
  -- CREATE / RESET RESULT
  --
  -- A submitted checkpoint awaiting evaluation is represented
  -- by "pending" in checkpoint_results.
  -- ----------------------------------------------------------

  insert into public.checkpoint_results (
    learner_id,
    checkpoint_id,
    status,
    submitted_at
  )
  values (
    auth.uid(),
    target_checkpoint_id,
    'pending',
    now()
  )

  on conflict (learner_id, checkpoint_id)

  do update set
    status = 'pending',
    submitted_at = now(),
    score = null,
    passed = null,
    trainer_feedback = null,
    graded_at = null,
    graded_by = null;

end;
$function$;



-- ============================================================
-- 2. GRADE CHECKPOINT RESULT
-- graded -> completed
-- ============================================================

create or replace function public.grade_checkpoint_result(
  target_result_id uuid,
  awarded_score numeric,
  feedback text default null::text
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  threshold numeric;
begin

  -- ----------------------------------------------------------
  -- SECURITY
  -- ----------------------------------------------------------

  if not public.is_trainer() then
    raise exception 'Trainer access required';
  end if;


  -- ----------------------------------------------------------
  -- SCORE VALIDATION
  -- ----------------------------------------------------------

  if awarded_score < 0 or awarded_score > 100 then
    raise exception 'Score must be between 0 and 100';
  end if;


  -- ----------------------------------------------------------
  -- PASSING THRESHOLD
  -- ----------------------------------------------------------

  select
    coalesce(c.passing_score, 0)
  into threshold
  from public.checkpoint_results r
  join public.checkpoints c
    on c.id = r.checkpoint_id
  where r.id = target_result_id;


  if not found then
    raise exception 'Checkpoint result not found';
  end if;


  -- ----------------------------------------------------------
  -- FINALIZE RESULT
  --
  -- checkpoint_results uses "completed" for a finalized result.
  -- ----------------------------------------------------------

  update public.checkpoint_results
  set
    score = awarded_score,
    passed = awarded_score >= threshold,
    status = 'completed',
    trainer_feedback = nullif(trim(feedback), ''),
    graded_at = now(),
    graded_by = auth.uid()
  where id = target_result_id;

end;
$function$;



-- ============================================================
-- 3. AUDIT
-- ============================================================

select
  p.proname as function_name,

  case
    when p.proname = 'submit_checkpoint'
      and pg_get_functiondef(p.oid) like '%status = ''pending''%'
      and pg_get_functiondef(p.oid) not like '%status = ''submitted''%'
      and pg_get_functiondef(p.oid) like '%''pending''%'
    then 'PASS'

    when p.proname = 'grade_checkpoint_result'
      and pg_get_functiondef(p.oid) like '%status = ''completed''%'
      and pg_get_functiondef(p.oid) not like '%status = ''graded''%'
    then 'PASS'

    else 'CHECK'
  end as status_fix,

  case
    when pg_get_functiondef(p.oid) like '%''submitted''%'
      then 'FOUND'
    else 'NO'
  end as old_submitted_reference,

  case
    when pg_get_functiondef(p.oid) like '%''graded''%'
      then 'FOUND'
    else 'NO'
  end as old_graded_reference

from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'submit_checkpoint',
    'grade_checkpoint_result'
  )
order by p.proname;
