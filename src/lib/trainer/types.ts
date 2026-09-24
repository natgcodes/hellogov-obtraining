export type LearnerSetupItem = {
  id: string;
  title: string;
  required: boolean;
  completed: boolean;
};

export type LearnerModuleSummary = {
  id: string;
  title: string;
  day_number: number;
  day_title: string;
  status: string;
};

export type LearnerQuizAttemptSummary = {
  attempt_id: string;
  quiz_id?: string;
  quiz_title: string;
  attempt_number: number;
  score: number | null;
  passed: boolean | null;
  status: string;
  submitted_at?: string | null;
  graded_at?: string | null;
};

export type LearnerProfileSummary = {
  id?: string;
  full_name: string | null;
  email: string | null;
};

export type LearnerEnrollmentSummary = {
  status: string;
  progress_percent?: number | null;
};

export type LearnerSummary = {
  profile: LearnerProfileSummary | null;
  enrollment: LearnerEnrollmentSummary | null;
  setup: LearnerSetupItem[];
  modules: LearnerModuleSummary[];
  quiz_attempts: LearnerQuizAttemptSummary[];
};

export type ReviewQueueItem = {
  attempt_id: string;
  quiz_id?: string;
  quiz_title: string;
  learner_id?: string;
  learner_name: string | null;
  learner_email: string | null;
  attempt_number?: number;
  submitted_at?: string | null;
  score?: number | null;
  pending_answers: number;
};