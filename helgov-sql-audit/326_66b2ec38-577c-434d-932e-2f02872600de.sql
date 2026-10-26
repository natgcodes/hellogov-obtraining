│
◇  Downloading snippet...
-- =========================================================
-- 27 — Fix Quiz Submission Ambiguous Columns
-- =========================================================

create or replace function public.submit_quiz_attempt(
  target_attempt_id uuid
)
returns table(
  attempt_id uuid,
  score numeric,
  passed boolean,
  status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt record;
  v_question record;
  v_answer record;

  v_total_points numeric := 0;
  v_earned_points numeric := 0;
  v_question_points numeric := 0;

  v_correct_count int;
  v_selected_count int;
  v_total_correct_count int;

  v_matching_total int;
  v_matching_correct int;

  v_needs_manual_review boolean := false;

  v_final_score numeric := 0;
  v_final_passed boolean := false;
  v_final_status text := 'graded';
begin

  -- =======================================================
  -- ATTEMPT
  -- =======================================================

  select
    qa.*,
    q.passing_score
  into v_attempt
  from public.quiz_attempts qa
  join public.quizzes q
    on q.id = qa.quiz_id
  where qa.id = target_attempt_id
    and qa.learner_id = auth.uid();

  if v_attempt.id is null then
    raise exception 'Attempt not found';
  end if;

  if v_attempt.status <> 'in_progress' then
    raise exception 'Attempt has already been submitted';
  end if;


  -- =======================================================
  -- QUESTIONS
  -- =======================================================

  for v_question in
    select qq.*
    from public.quiz_questions qq
    where qq.quiz_id = v_attempt.quiz_id
    order by qq.position
  loop

    v_total_points :=
      v_total_points + coalesce(v_question.points, 0);

    v_question_points := 0;

    select qa.*
    into v_answer
    from public.quiz_answers qa
    where qa.attempt_id = target_attempt_id
      and qa.question_id = v_question.id
    limit 1;


    -- No answer = zero points
    if v_answer.id is null then
      continue;
    end if;


    -- =====================================================
    -- SINGLE CHOICE / TRUE FALSE
    -- =====================================================

    if v_question.question_type in (
      'single_choice',
      'true_false'
    ) then

      if exists (
        select 1
        from public.quiz_options qo
        where qo.id = v_answer.selected_option_id
          and qo.question_id = v_question.id
          and qo.is_correct = true
      ) then

        v_question_points := v_question.points;

        update public.quiz_answers qa
        set
          is_correct = true,
          points_awarded = v_question_points,
          graded_at = now()
        where qa.id = v_answer.id;

      else

        update public.quiz_answers qa
        set
          is_correct = false,
          points_awarded = 0,
          graded_at = now()
        where qa.id = v_answer.id;

      end if;


    -- =====================================================
    -- MULTIPLE CHOICE
    -- =====================================================

    elsif v_question.question_type = 'multiple_choice' then

      select count(*)
      into v_total_correct_count
      from public.quiz_options qo
      where qo.question_id = v_question.id
        and qo.is_correct = true;

      select count(*)
      into v_selected_count
      from public.quiz_answer_options qao
      where qao.answer_id = v_answer.id;

      select count(*)
      into v_correct_count
      from public.quiz_answer_options qao
      join public.quiz_options qo
        on qo.id = qao.option_id
      where qao.answer_id = v_answer.id
        and qo.question_id = v_question.id
        and qo.is_correct = true;

      if
        v_selected_count = v_total_correct_count
        and v_correct_count = v_total_correct_count
      then

        v_question_points := v_question.points;

      elsif
        v_question.allow_partial_credit
        and v_total_correct_count > 0
      then

        v_question_points :=
          greatest(
            0,
            v_question.points *
            (
              (
                v_correct_count -
                greatest(
                  0,
                  v_selected_count - v_correct_count
                )
              )::numeric
              /
              v_total_correct_count::numeric
            )
          );

      end if;

      update public.quiz_answers qa
      set
        is_correct = (
          v_selected_count = v_total_correct_count
          and v_correct_count = v_total_correct_count
        ),
        points_awarded = v_question_points,
        graded_at = now()
      where qa.id = v_answer.id;


    -- =====================================================
    -- MATCHING / MATCH CARDS
    -- =====================================================

    elsif v_question.question_type in (
      'matching',
      'match_cards'
    ) then

      select count(*)
      into v_matching_total
      from public.quiz_matching_pairs qmp
      where qmp.question_id = v_question.id;

      select count(*)
      into v_matching_correct
      from public.quiz_answer_matches qam
      join public.quiz_matching_pairs qmp
        on qmp.id = qam.left_pair_id
      where qam.answer_id = v_answer.id
        and qmp.question_id = v_question.id
        and qmp.right_public_id =
          qam.selected_right_public_id;

      if
        v_matching_total > 0
        and v_matching_correct = v_matching_total
      then

        v_question_points := v_question.points;

      elsif
        v_question.allow_partial_credit
        and v_matching_total > 0
      then

        v_question_points :=
          v_question.points *
          (
            v_matching_correct::numeric
            /
            v_matching_total::numeric
          );

      end if;

      update public.quiz_answers qa
      set
        is_correct = (
          v_matching_total > 0
          and v_matching_correct = v_matching_total
        ),
        points_awarded = v_question_points,
        graded_at = now()
      where qa.id = v_answer.id;


    -- =====================================================
    -- MANUAL REVIEW
    -- =====================================================

    elsif v_question.question_type in (
      'open_text',
      'file_upload'
    ) then

      v_needs_manual_review := true;

      update public.quiz_answers qa
      set
        is_correct = null,
        points_awarded = null,
        graded_at = null
      where qa.id = v_answer.id;

    end if;


    v_earned_points :=
      v_earned_points + v_question_points;

  end loop;


  -- =======================================================
  -- FINAL SCORE
  -- =======================================================

  if v_total_points > 0 then
    v_final_score :=
      round(
        (v_earned_points / v_total_points) * 100,
        2
      );
  else
    v_final_score := 0;
  end if;


  if v_needs_manual_review then
    v_final_status := 'needs_review';
    v_final_passed := false;
  else
    v_final_status := 'graded';
    v_final_passed :=
      v_final_score >= v_attempt.passing_score;
  end if;


  -- =======================================================
  -- SAVE ATTEMPT
  -- =======================================================

  update public.quiz_attempts qa
  set
    score = v_final_score,

    passed =
      case
        when v_needs_manual_review
          then null
        else v_final_passed
      end,

    status = v_final_status,

    submitted_at = now(),

    graded_at =
      case
        when v_needs_manual_review
          then null
        else now()
      end

  where qa.id = target_attempt_id;


  -- =======================================================
  -- RETURN RESULT
  -- =======================================================

  return query
  select
    target_attempt_id as attempt_id,
    v_final_score as score,

    case
      when v_needs_manual_review
        then null::boolean
      else v_final_passed
    end as passed,

    v_final_status as status;

end;
$$;


revoke all
on function public.submit_quiz_attempt(uuid)
from public;

grant execute
on function public.submit_quiz_attempt(uuid)
to authenticated;
