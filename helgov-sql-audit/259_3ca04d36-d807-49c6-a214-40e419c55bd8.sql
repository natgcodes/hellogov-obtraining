│
◇  Downloading snippet...
-- ============================================================
-- QUERY 84B
-- RECREATE get_trainer_learner_checkpoints
-- ============================================================

drop function if exists public.get_trainer_learner_checkpoints(uuid, uuid);

create function public.get_trainer_learner_checkpoints(
  target_program_id uuid,
  target_learner_id uuid
)
returns table(
  checkpoint_id uuid,
  quiz_id uuid,
  title text,
  description text,
  checkpoint_type text,

  day_id uuid,
  day_number integer,
  day_title text,
  day_position integer,

  position integer,
  is_required boolean,
  passing_score numeric,

  result_id uuid,
  result_status text,
  score numeric,
  passed boolean,
  submitted_at timestamptz,
  graded_at timestamptz,
  trainer_feedback text,

  checkpoint_status text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin

  -- SECURITY
  if not public.is_trainer() then
    raise exception 'Trainer access required';
  end if;

  -- VALIDATE ENROLLMENT
  if not exists (
    select 1
    from public.program_enrollments pe
    where pe.program_id = target_program_id
      and pe.learner_id = target_learner_id
  ) then
    raise exception 'Learner is not enrolled in this program';
  end if;

  return query

  select
    c.id,
    c.quiz_id,
    c.title,
    c.description,
    c.checkpoint_type,

    d.id,
    d.day_number,
    d.title,
    d.position,

    c.position,
    c.is_required,

    coalesce(
      c.passing_score,
      q.passing_score
    ),

    cr.id,
    cr.status,
    cr.score,
    cr.passed,
    cr.submitted_at,
    cr.graded_at,
    cr.trainer_feedback,

    case
      when cr.id is null
        then 'not_started'

      when cr.status = 'submitted'
        then 'submitted'

      when cr.status = 'needs_review'
        then 'needs_review'

      when cr.status = 'graded'
        and cr.passed = true
        then 'passed'

      when cr.status = 'graded'
        and cr.passed = false
        then 'not_passed'

      else coalesce(
        cr.status,
        'not_started'
      )
    end::text

  from public.checkpoints c

  join public.days d
    on d.id = c.day_id

  left join public.quizzes q
    on q.id = c.quiz_id

  left join public.checkpoint_results cr
    on cr.checkpoint_id = c.id
    and cr.learner_id = target_learner_id

  where d.program_id = target_program_id
    and d.is_published = true

  order by
    d.position,
    d.day_number,
    c.position,
    c.title;

end;
$function$;
