│
◇  Downloading snippet...
-- =========================================================
-- 26 — Quiz Answer Ambiguity Fix
-- Fix ambiguous answer_id references in quiz save functions
-- =========================================================


-- =========================================================
-- 1. SINGLE CHOICE / TRUE FALSE / OPEN TEXT
-- =========================================================

create or replace function public.save_quiz_answer(
  target_attempt_id uuid,
  target_question_id uuid,
  target_option_id uuid default null,
  target_answer_text text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_answer_id uuid;
  v_question_type text;
begin
  if not exists (
    select 1
    from public.quiz_attempts qa
    join public.quiz_questions qq
      on qq.quiz_id = qa.quiz_id
    where qa.id = target_attempt_id
      and qa.learner_id = auth.uid()
      and qa.status = 'in_progress'
      and qq.id = target_question_id
  ) then
    raise exception 'Invalid attempt or question';
  end if;

  select qq.question_type
  into v_question_type
  from public.quiz_questions qq
  where qq.id = target_question_id;

  if v_question_type not in (
    'single_choice',
    'true_false',
    'open_text'
  ) then
    raise exception 'Unsupported answer type';
  end if;

  if target_option_id is not null
     and not exists (
       select 1
       from public.quiz_options qo
       where qo.id = target_option_id
         and qo.question_id = target_question_id
     )
  then
    raise exception 'Invalid option';
  end if;

  select qa.id
  into v_answer_id
  from public.quiz_answers qa
  where qa.attempt_id = target_attempt_id
    and qa.question_id = target_question_id
  limit 1;

  if v_answer_id is null then
    insert into public.quiz_answers (
      attempt_id,
      question_id,
      selected_option_id,
      answer_text
    )
    values (
      target_attempt_id,
      target_question_id,
      target_option_id,
      target_answer_text
    )
    returning id into v_answer_id;
  else
    update public.quiz_answers qa
    set
      selected_option_id = target_option_id,
      answer_text = target_answer_text,
      is_correct = null,
      points_awarded = null,
      trainer_feedback = null,
      graded_at = null
    where qa.id = v_answer_id;
  end if;

  return v_answer_id;
end;
$$;


-- =========================================================
-- 2. MULTIPLE CHOICE
-- =========================================================

create or replace function public.save_multiple_choice_answer(
  target_attempt_id uuid,
  target_question_id uuid,
  target_option_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_answer_id uuid;
  v_option_id uuid;
begin
  if not exists (
    select 1
    from public.quiz_attempts qa
    join public.quiz_questions qq
      on qq.quiz_id = qa.quiz_id
    where qa.id = target_attempt_id
      and qa.learner_id = auth.uid()
      and qa.status = 'in_progress'
      and qq.id = target_question_id
      and qq.question_type = 'multiple_choice'
  ) then
    raise exception 'Invalid attempt or question';
  end if;

  select qa.id
  into v_answer_id
  from public.quiz_answers qa
  where qa.attempt_id = target_attempt_id
    and qa.question_id = target_question_id
  limit 1;

  if v_answer_id is null then
    insert into public.quiz_answers (
      attempt_id,
      question_id
    )
    values (
      target_attempt_id,
      target_question_id
    )
    returning id into v_answer_id;
  end if;

  delete from public.quiz_answer_options qao
  where qao.answer_id = v_answer_id;

  foreach v_option_id in array
    coalesce(target_option_ids, array[]::uuid[])
  loop
    if not exists (
      select 1
      from public.quiz_options qo
      where qo.id = v_option_id
        and qo.question_id = target_question_id
    ) then
      raise exception 'Invalid option';
    end if;

    insert into public.quiz_answer_options (
      answer_id,
      option_id
    )
    values (
      v_answer_id,
      v_option_id
    );
  end loop;

  update public.quiz_answers qa
  set
    is_correct = null,
    points_awarded = null,
    trainer_feedback = null,
    graded_at = null
  where qa.id = v_answer_id;

  return v_answer_id;
end;
$$;


-- =========================================================
-- 3. MATCHING / MATCH CARDS
-- =========================================================

create or replace function public.save_matching_answer(
  target_attempt_id uuid,
  target_question_id uuid,
  left_pair_ids uuid[],
  selected_right_public_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_answer_id uuid;
  v_index integer;
begin
  if coalesce(array_length(left_pair_ids, 1), 0)
     <>
     coalesce(array_length(selected_right_public_ids, 1), 0)
  then
    raise exception 'Matching arrays must have equal length';
  end if;

  if not exists (
    select 1
    from public.quiz_attempts qa
    join public.quiz_questions qq
      on qq.quiz_id = qa.quiz_id
    where qa.id = target_attempt_id
      and qa.learner_id = auth.uid()
      and qa.status = 'in_progress'
      and qq.id = target_question_id
      and qq.question_type in (
        'matching',
        'match_cards'
      )
  ) then
    raise exception 'Invalid attempt or question';
  end if;

  select qa.id
  into v_answer_id
  from public.quiz_answers qa
  where qa.attempt_id = target_attempt_id
    and qa.question_id = target_question_id
  limit 1;

  if v_answer_id is null then
    insert into public.quiz_answers (
      attempt_id,
      question_id
    )
    values (
      target_attempt_id,
      target_question_id
    )
    returning id into v_answer_id;
  end if;

  delete from public.quiz_answer_matches qam
  where qam.answer_id = v_answer_id;

  if coalesce(array_length(left_pair_ids, 1), 0) > 0 then
    for v_index in 1..array_length(left_pair_ids, 1)
    loop
      if not exists (
        select 1
        from public.quiz_matching_pairs qmp
        where qmp.id = left_pair_ids[v_index]
          and qmp.question_id = target_question_id
      ) then
        raise exception 'Invalid matching item';
      end if;

      if not exists (
        select 1
        from public.quiz_matching_pairs qmp
        where qmp.right_public_id =
          selected_right_public_ids[v_index]
          and qmp.question_id = target_question_id
      ) then
        raise exception 'Invalid matching answer';
      end if;

      insert into public.quiz_answer_matches (
        answer_id,
        left_pair_id,
        selected_right_public_id
      )
      values (
        v_answer_id,
        left_pair_ids[v_index],
        selected_right_public_ids[v_index]
      );
    end loop;
  end if;

  update public.quiz_answers qa
  set
    is_correct = null,
    points_awarded = null,
    trainer_feedback = null,
    graded_at = null
  where qa.id = v_answer_id;

  return v_answer_id;
end;
$$;


-- =========================================================
-- 4. FILE UPLOAD
-- =========================================================

create or replace function public.save_file_answer(
  target_attempt_id uuid,
  target_question_id uuid,
  target_file_path text,
  target_file_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_answer_id uuid;
begin
  if not exists (
    select 1
    from public.quiz_attempts qa
    join public.quiz_questions qq
      on qq.quiz_id = qa.quiz_id
    where qa.id = target_attempt_id
      and qa.learner_id = auth.uid()
      and qa.status = 'in_progress'
      and qq.id = target_question_id
      and qq.question_type = 'file_upload'
  ) then
    raise exception 'Invalid attempt or question';
  end if;

  select qa.id
  into v_answer_id
  from public.quiz_answers qa
  where qa.attempt_id = target_attempt_id
    and qa.question_id = target_question_id
  limit 1;

  if v_answer_id is null then
    insert into public.quiz_answers (
      attempt_id,
      question_id,
      file_path,
      file_name
    )
    values (
      target_attempt_id,
      target_question_id,
      target_file_path,
      target_file_name
    )
    returning id into v_answer_id;
  else
    update public.quiz_answers qa
    set
      file_path = target_file_path,
      file_name = target_file_name,
      is_correct = null,
      points_awarded = null,
      trainer_feedback = null,
      graded_at = null
    where qa.id = v_answer_id;
  end if;

  return v_answer_id;
end;
$$;


-- =========================================================
-- Permissions
-- =========================================================

revoke all
on function public.save_quiz_answer(uuid, uuid, uuid, text)
from public;

revoke all
on function public.save_multiple_choice_answer(uuid, uuid, uuid[])
from public;

revoke all
on function public.save_matching_answer(uuid, uuid, uuid[], uuid[])
from public;

revoke all
on function public.save_file_answer(uuid, uuid, text, text)
from public;


grant execute
on function public.save_quiz_answer(uuid, uuid, uuid, text)
to authenticated;

grant execute
on function public.save_multiple_choice_answer(uuid, uuid, uuid[])
to authenticated;

grant execute
on function public.save_matching_answer(uuid, uuid, uuid[], uuid[])
to authenticated;

grant execute
on function public.save_file_answer(uuid, uuid, text, text)
to authenticated;
