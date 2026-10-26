│
◇  Downloading snippet...
-- ============================================================
-- 10 - QUIZ LEARNER SAFE RPCs
-- ============================================================


-- ============================================================
-- SAFE MULTIPLE-CHOICE OPTIONS
-- Returns option content WITHOUT is_correct
-- ============================================================

drop function if exists public.get_quiz_options_for_learner(uuid);

create function public.get_quiz_options_for_learner(
  p_question_id uuid
)
returns table (
  option_id uuid,
  option_text text,
  item_position int4
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    qo.id as option_id,
    qo.option_text,
    qo.position as item_position
  from public.quiz_options qo

  join public.quiz_questions qq
    on qq.id = qo.question_id

  join public.quizzes q
    on q.id = qq.quiz_id

  join public.modules m
    on m.id = q.module_id

  join public.days d
    on d.id = m.day_id

  join public.programs p
    on p.id = d.program_id

  where qo.question_id = p_question_id
    and auth.uid() is not null
    and (
      public.is_trainer()
      or (
        q.is_published = true
        and d.is_published = true
        and p.status = 'published'
      )
    )

  order by qo.position;
$$;


revoke all
on function public.get_quiz_options_for_learner(uuid)
from public;

grant execute
on function public.get_quiz_options_for_learner(uuid)
to authenticated;



-- ============================================================
-- SAFE MATCHING / MATCH CARDS ITEMS
--
-- Important:
-- The learner receives both sides independently.
-- The relationship between them is NOT returned.
-- ============================================================

drop function if exists public.get_matching_items_for_learner(uuid);

create function public.get_matching_items_for_learner(
  p_question_id uuid
)
returns table (
  pair_id uuid,
  item_text text,
  item_side text,
  item_position int4
)
language sql
stable
security definer
set search_path = ''
as $$

  select
    qmp.id as pair_id,
    qmp.left_text as item_text,
    'left'::text as item_side,
    qmp.position as item_position
  from public.quiz_matching_pairs qmp

  join public.quiz_questions qq
    on qq.id = qmp.question_id

  join public.quizzes q
    on q.id = qq.quiz_id

  join public.modules m
    on m.id = q.module_id

  join public.days d
    on d.id = m.day_id

  join public.programs p
    on p.id = d.program_id

  where qmp.question_id = p_question_id
    and auth.uid() is not null
    and (
      public.is_trainer()
      or (
        q.is_published = true
        and d.is_published = true
        and p.status = 'published'
      )
    )

  union all

  select
    qmp.id as pair_id,
    qmp.right_text as item_text,
    'right'::text as item_side,
    qmp.position as item_position
  from public.quiz_matching_pairs qmp

  join public.quiz_questions qq
    on qq.id = qmp.question_id

  join public.quizzes q
    on q.id = qq.quiz_id

  join public.modules m
    on m.id = q.module_id

  join public.days d
    on d.id = m.day_id

  join public.programs p
    on p.id = d.program_id

  where qmp.question_id = p_question_id
    and auth.uid() is not null
    and (
      public.is_trainer()
      or (
        q.is_published = true
        and d.is_published = true
        and p.status = 'published'
      )
    );

$$;


revoke all
on function public.get_matching_items_for_learner(uuid)
from public;

grant execute
on function public.get_matching_items_for_learner(uuid)
to authenticated;
