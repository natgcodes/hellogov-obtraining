│
◇  Downloading snippet...
do $$
declare
  v_program_id uuid := '5f5a6ef1-3133-45f6-b421-0dc09ea4a6a0';
  v_certification_id uuid;
  v_post_training_id uuid;
begin

  -- =========================================================
  -- TOOL SETUP
  -- =========================================================

  insert into public.setup_items (
    program_id,
    title,
    description,
    position,
    is_required
  )
  values
    (
      v_program_id,
      'HelloGov Account',
      'Confirm access to the HelloGov platform and required permissions.',
      1,
      true
    ),
    (
      v_program_id,
      'Communication Tools',
      'Confirm access to the communication channels and tools required during training and production.',
      2,
      true
    ),
    (
      v_program_id,
      'Training Resources',
      'Confirm access to the training materials and shared resources used throughout onboarding.',
      3,
      true
    );


  -- =========================================================
  -- CERTIFICATION
  -- =========================================================

  insert into public.certifications (
    program_id,
    title,
    description,
    passing_score
  )
  values (
    v_program_id,
    'HelloGov Customer Support Certification',
    'Final assessment used to confirm that the learner is ready to move from onboarding into supported production.',
    80
  )
  returning id into v_certification_id;


  insert into public.certification_components (
    certification_id,
    title,
    description,
    component_type,
    passing_score,
    position
  )
  values
    (
      v_certification_id,
      'Knowledge Assessment',
      'Evaluate understanding of the core concepts, policies and processes covered during onboarding.',
      'knowledge',
      80,
      1
    ),
    (
      v_certification_id,
      'Platform Assessment',
      'Evaluate the learner''s ability to navigate the required tools and complete key operational tasks.',
      'practical',
      80,
      2
    ),
    (
      v_certification_id,
      'Mock Call Assessment',
      'Evaluate call flow, communication, process application and customer handling in a simulated customer interaction.',
      'mock_call',
      80,
      3
    );


  -- =========================================================
  -- POST-TRAINING
  -- =========================================================

  insert into public.post_training (
    program_id,
    title,
    description,
    disclaimer
  )
  values (
    v_program_id,
    'Nesting & Supported Production',
    'Transition learners from structured onboarding into supported customer interactions with continued guidance and performance follow-up.',
    'Post-training activities and timelines may be adjusted based on operational needs and learner performance.'
  )
  returning id into v_post_training_id;


  insert into public.post_training_stages (
    post_training_id,
    title,
    description,
    position
  )
  values
    (
      v_post_training_id,
      'Shadowing',
      'Observe experienced agents handling customer interactions and applying the processes covered during onboarding.',
      1
    ),
    (
      v_post_training_id,
      'Supported Calls',
      'Begin handling customer interactions with trainer or operational support available when needed.',
      2
    ),
    (
      v_post_training_id,
      'QA Follow-Up',
      'Review early interactions and quality results to identify strengths, gaps and additional support needs.',
      3
    ),
    (
      v_post_training_id,
      'Coaching & Reinforcement',
      'Provide targeted coaching, reinforcement or additional practice based on early production performance.',
      4
    );

end $$;
