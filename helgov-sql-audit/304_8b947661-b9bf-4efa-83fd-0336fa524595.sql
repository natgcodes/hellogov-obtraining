│
◇  Downloading snippet...
create or replace function public.can_access_quiz(
  target_quiz_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$

  select
    public.is_trainer()

    -- -------------------------------------------------------
    -- NORMAL MODULE QUIZ
    -- quiz -> module -> day -> program
    -- -------------------------------------------------------

    or exists (
      select 1
      from public.quizzes q
      join public.modules m
        on m.id = q.module_id
      join public.days d
        on d.id = m.day_id
      join public.programs p
        on p.id = d.program_id
      where q.id = target_quiz_id
        and q.is_published = true
        and d.is_published = true
        and p.status = 'published'
    )

    -- -------------------------------------------------------
    -- CHECKPOINT QUIZ
    -- quiz -> checkpoint -> day -> program
    -- -------------------------------------------------------

    or exists (
      select 1
      from public.quizzes q
      join public.checkpoints c
        on c.quiz_id = q.id
      join public.days d
        on d.id = c.day_id
      join public.programs p
        on p.id = d.program_id
      where q.id = target_quiz_id
        and q.is_published = true
        and d.is_published = true
        and p.status = 'published'
    );

$function$;
