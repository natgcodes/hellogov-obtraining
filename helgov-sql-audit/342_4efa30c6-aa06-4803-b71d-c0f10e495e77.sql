│
◇  Downloading snippet...
insert into public.checkpoints (
  day_id,
  title,
  description,
  checkpoint_type,
  passing_score,
  position
)
values (
  'b32a22c3-d046-4e5f-a022-a688b335e2c5',
  'Knowledge Check',
  'Evaluate learner understanding of the key concepts covered during Day 1.',
  'knowledge',
  80,
  1
)
returning
  id,
  day_id,
  title,
  checkpoint_type,
  passing_score,
  position;
