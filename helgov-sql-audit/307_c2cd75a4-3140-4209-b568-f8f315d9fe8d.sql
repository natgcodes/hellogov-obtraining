│
◇  Downloading snippet...
select
  c.id as checkpoint_id,
  c.title as checkpoint_title,
  c.day_id,
  c.quiz_id,

  q.id as quiz_id_found,
  q.module_id,
  q.title as quiz_title,
  q.is_published,

  count(qq.id) as question_count

from checkpoints c

left join quizzes q
  on q.id = c.quiz_id

left join quiz_questions qq
  on qq.quiz_id = q.id

group by
  c.id,
  c.title,
  c.day_id,
  c.quiz_id,
  q.id,
  q.module_id,
  q.title,
  q.is_published

order by c.position;
