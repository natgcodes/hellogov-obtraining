export type LearnerMaterial = {
  id: string;
  title: string;
  description: string | null;
  material_type: string;
  url: string | null;
  is_required: boolean;
  position: number;
};

export type LearnerActivity = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  activity_type: string;
  duration_minutes: number | null;
  is_required: boolean;
  position: number;
};

export type LearnerQuiz = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  passing_score: number;
  max_attempts: number;
  position: number;
  is_required: boolean;
  is_published: boolean;
  show_results: boolean;
};

export type LearnerModule = {
  id: string;
  title: string;
  description: string | null;
  objective: string | null;
  duration_minutes: number | null;
  position: number;
  is_required: boolean;
  materials: LearnerMaterial[];
  activities: LearnerActivity[];
  quizzes: LearnerQuiz[];
};

export type LearnerDay = {
  id: string;
  day_number: number;
  title: string;
  description: string | null;
  position: number;
  is_published: boolean;
  modules: LearnerModule[];
};

export type SetupItem = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  is_required: boolean;
};

export type LearnerProgram = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  setup_items: SetupItem[];
  days: LearnerDay[];
};

export type ProgressMap = {
  setup: Record<string, boolean>;
  materials: Record<string, boolean>;
  activities: Record<string, string>;
  modules: Record<string, string>;
  percent: number;
};