export type TrainerLearner = {
  learner_id: string;
  full_name: string | null;
  email: string | null;
  enrollment_status: string;
  enrolled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  progress_percent: number;
  completed_modules: number;
  total_modules: number;
  passed_quizzes: number;
  total_quizzes: number;
  needs_review: number;
};

export type ReviewQueueItem = {
  attempt_id: string;
  learner_id: string;
  learner_name: string | null;
  learner_email: string | null;
  quiz_id: string;
  quiz_title: string;
  submitted_at: string | null;
  current_score: number | null;
  pending_answers: number;
};

export type LearnerSummary = {
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;

  enrollment: {
    id: string;
    status: string;
    enrolled_at: string | null;
    started_at: string | null;
    completed_at: string | null;
  } | null;

  setup: Array<{
    id: string;
    title: string;
    required: boolean;
    completed: boolean;
    completed_at: string | null;
  }>;

  modules: Array<{
    id: string;
    title: string;
    day_id: string;
    day_number: number;
    day_title: string;
    required: boolean;
    status: string;
    started_at: string | null;
    completed_at: string | null;
  }>;

  quiz_attempts: Array<{
    attempt_id: string;
    quiz_id: string;
    quiz_title: string;
    attempt_number: number;
    score: number | null;
    passed: boolean | null;
    status: string;
    started_at: string | null;
    submitted_at: string | null;
    graded_at: string | null;
  }>;
};