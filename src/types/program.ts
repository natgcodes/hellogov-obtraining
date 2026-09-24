export type MaterialType =
  | "link"
  | "video"
  | "document"
  | "presentation"
  | "reading"
  | "other";

export type ActivityType =
  | "practice"
  | "written"
  | "case"
  | "roleplay"
  | "mock_call"
  | "shadowing"
  | "other";

export type CheckpointType =
  | "knowledge"
  | "practical"
  | "mock_call"
  | "trainer_review"
  | "other";

export type ProgramStatus = "draft" | "published";

export type TrainingMaterial = {
  id: string;
  title: string;
  description?: string | null;
  materialType: MaterialType;
  url?: string | null;
  required: boolean;
  position: number;
};

export type TrainingActivity = {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  activityType: ActivityType;
  durationMinutes?: number | null;
  required: boolean;
  position: number;
};

export type TrainingModule = {
  id: string;
  title: string;
  description?: string | null;
  objective?: string | null;
  durationMinutes?: number | null;
  required: boolean;
  position: number;
  materials: TrainingMaterial[];
  activities: TrainingActivity[];
};

export type TrainingCheckpoint = {
  id: string;
  title: string;
  description?: string | null;
  checkpointType: CheckpointType;
  passingScore?: number | null;
  position: number;
};

export type TrainingDay = {
  id: string;
  dayNumber: number;
  title: string;
  description?: string | null;
  position: number;
  isPublished: boolean;
  modules: TrainingModule[];
  checkpoints: TrainingCheckpoint[];
};