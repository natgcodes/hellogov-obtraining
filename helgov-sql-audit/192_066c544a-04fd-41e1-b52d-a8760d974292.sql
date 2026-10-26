│
◇  Downloading snippet...
-- QUERY 46 — Trainer Impersonated Learner Day Progress

create or replace function public.get_trainer_impersonated_day_progress(
  target_day_id uuid,
  target_learner_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  current_user_id uuid;
  result jsonb;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_trainer() then
    raise exception 'Trainer access required';
  end if;

  select jsonb_build_object(

    'modules',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'module_id', m.id,
            'status', lmp.status
          )
        )
        from public.modules m
        join public.learner_module_progress lmp
          on lmp.module_id = m.id
         and lmp.learner_id = target_learner_id
        where m.day_id = target_day_id
      ),
      '[]'::jsonb
    ),

    'materials',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'material_id', mat.id,
            'completed', lmp.completed
          )
        )
        from public.modules m
        join public.materials mat
          on mat.module_id = m.id
        join public.learner_material_progress lmp
          on lmp.material_id = mat.id
         and lmp.learner_id = target_learner_id
        where m.day_id = target_day_id
      ),
      '[]'::jsonb
    ),

    'activities',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'activity_id', a.id,
            'status', lap.status
          )
        )
        from public.modules m
        join public.activities a
          on a.module_id = m.id
        join public.learner_activity_progress lap
          on lap.activity_id = a.id
         and lap.learner_id = target_learner_id
        where m.day_id = target_day_id
      ),
      '[]'::jsonb
    ),

    'checkpoints',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'checkpoint_id', c.id,
            'status', cr.status,
            'score', cr.score,
            'passed', cr.passed,
            'trainer_feedback', cr.trainer_feedback,
            'submitted_at', cr.submitted_at,
            'graded_at', cr.graded_at
          )
        )
        from public.checkpoints c
        join public.checkpoint_results cr
          on cr.checkpoint_id = c.id
         and cr.learner_id = target_learner_id
        where c.day_id = target_day_id
      ),
      '[]'::jsonb
    )

  )
  into result;

  return result;
end;
$function$;

revoke all
on function public.get_trainer_impersonated_day_progress(uuid, uuid)
from public;

grant execute
on function public.get_trainer_impersonated_day_progress(uuid, uuid)
to authenticated;
