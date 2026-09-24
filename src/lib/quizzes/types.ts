export type SafeQuizOption = {
  option_id: string;
  option_text: string;
  item_position: number;
};

export type SafeMatchingItem = {
  item_id: string;
  item_text: string;
  item_side: "left" | "right";
  display_order: number;
};

export type LearnerQuizQuestion = {
  id: string;
  question_text: string;
  question_type:
    | "single_choice"
    | "multiple_choice"
    | "true_false"
    | "matching"
    | "match_cards"
    | "open_text"
    | "file_upload";
  instructions: string | null;
  points: number;
  position: number;
  is_required: boolean;
  allow_partial_credit: boolean;
  options: SafeQuizOption[];
  matchingItems: SafeMatchingItem[];
};

export type LearnerQuizDetail = {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  passing_score: number;
  max_attempts: number;
  show_results: boolean;
  shuffle_questions: boolean;
  questions: LearnerQuizQuestion[];
};

export type QuizSubmissionResult = {
  attempt_id: string;
  score: number;
  passed: boolean | null;
  status: "graded" | "needs_review";
};

export type AnswerState = {
  optionId?: string;
  optionIds?: string[];
  text?: string;
  matches?: Record<string, string>;
  filePath?: string;
  fileName?: string;
};