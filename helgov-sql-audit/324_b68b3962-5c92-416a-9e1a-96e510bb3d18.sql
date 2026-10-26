│
◇  Downloading snippet...
-- Query 29 — Inspect Stored Answer Details
-- Shows exactly what was stored for every submitted answer.

select
  qa.id as answer_id,
  qq.position as question_position,
  qq.question_text,
  qq.question_type,

  qa.selected_option_id,
  selected_option.option_text as selected_option_text,

  qa.answer_text,
  qa.file_name,

  qao.option_id as multiple_option_id,
  multiple_option.option_text as multiple_option_text,

  qam.left_pair_id,
  left_pair.left_text,

  qam.selected_right_public_id,
  right_pair.right_text as selected_right_text,

  qa.is_correct,
  qa.points_awarded

from public.quiz_answers qa

join public.quiz_questions qq
  on qq.id = qa.question_id

left join public.quiz_options selected_option
  on selected_option.id = qa.selected_option_id

left join public.quiz_answer_options qao
  on qao.answer_id = qa.id

left join public.quiz_options multiple_option
  on multiple_option.id = qao.option_id

left join public.quiz_answer_matches qam
  on qam.answer_id = qa.id

left join public.quiz_matching_pairs left_pair
  on left_pair.id = qam.left_pair_id

left join public.quiz_matching_pairs right_pair
  on right_pair.question_id = qa.question_id
 and right_pair.right_public_id = qam.selected_right_public_id

where qa.attempt_id = 'a37fdac9-54a1-4704-ad89-9d7c38edd427'

order by
  qq.position,
  left_pair.position,
  multiple_option.position;
