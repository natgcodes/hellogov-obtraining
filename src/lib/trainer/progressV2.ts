export type TrainingWave = { id: string; title: string; status: string };
export type ProgressSnapshot = {
  learner_id: string; full_name: string | null; email: string | null;
  role: string; account_status: string; program_id: string; wave_title: string;
  program_status: string; is_active_wave: boolean; training_status: string;
  enrollment_status: string; overall_progress: number; available_progress: number;
  completed_modules: number; total_modules: number; available_modules: number;
  submitted_assessments: number; passed_assessments: number; total_assessments: number;
  available_assessments: number; pending_review_assessments: number;
  completed_checkpoints: number; total_checkpoints: number;
};
export type ModuleSnapshot = {
  module_id: string; module_title: string; day_number: number; day_id: string;
  is_required: boolean; available: boolean; publication_status: string;
  calculated_status: string; stored_status: string;
};
export type AssessmentSnapshot = {
  id: string; title: string; day_number: number; module_title: string | null;
  assessment_type: string; available: boolean; is_required: boolean;
  latest_attempt_id: string | null; latest_attempt_status: string;
  latest_score: number | null; latest_passed: boolean | null; best_score: number | null;
  ever_passed: boolean; manually_completed: boolean; completion: boolean;
  submitted_at: string | null; submitted_attempt_count: number; pending_review_count: number;
  cancelled_attempt_count: number;
};
export type ProgressDetail = ProgressSnapshot & { modules: ModuleSnapshot[]; assessments: AssessmentSnapshot[] };
export const withWave = (path: string, programId: string) => `${path}?wave=${encodeURIComponent(programId)}`;
export const statusLabel = (status: string) => status.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
