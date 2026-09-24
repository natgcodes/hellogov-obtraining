"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ModuleEditor from "@/components/trainer/ModuleEditor";
import MaterialEditor from "@/components/trainer/MaterialEditor";
import ActivityEditor from "@/components/trainer/ActivityEditor";
import CheckpointEditor from "@/components/trainer/CheckpointEditor";
import AddModuleEditor from "@/components/trainer/AddModuleEditor";
import AddMaterialEditor from "@/components/trainer/AddMaterialEditor";
import AddActivityEditor from "@/components/trainer/AddActivityEditor";
import AddCheckpointEditor from "@/components/trainer/AddCheckpointEditor";
import DaySettingsEditor from "@/components/trainer/DaySettingsEditor";
import AddQuizEditor from "@/components/trainer/AddQuizEditor";
import QuizEditor, {
  Quiz,
} from "@/components/trainer/QuizEditor";

type SupabaseMaterial = {
  id: string;
  title: string;
  description: string | null;
  material_type: string;
  url: string | null;
  is_required: boolean;
  position: number;
};

type SupabaseActivity = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  activity_type: string;
  duration_minutes: number | null;
  is_required: boolean;
  position: number;
};

type SupabaseModule = {
  id: string;
  title: string;
  description: string | null;
  objective: string | null;
  duration_minutes: number | null;
  position: number;
  is_required: boolean;
  materials: SupabaseMaterial[];
  activities: SupabaseActivity[];
  quizzes: Quiz[];
};

type SupabaseCheckpoint = {
  id: string;
  quiz_id: string | null;
  title: string;
  description: string | null;
  checkpoint_type: string;
  passing_score: number | null;
  position: number;
  quizzes: Quiz | null;
};

type SupabaseDay = {
  id: string;
  day_number: number;
  title: string;
  description: string | null;
  position: number;
  is_published: boolean;
  modules: SupabaseModule[];
  checkpoints: SupabaseCheckpoint[];
};

type DayEditorProps = {
  day: SupabaseDay | null;
  dayNumber: number;
  title: string;
  description: string;
  onClose: () => void;
};

type MoveDirection = "up" | "down";

type ReorderTable =
  | "modules"
  | "materials"
  | "activities"
  | "quizzes"
  | "checkpoints";

function formatDuration(minutes?: number | null) {
  if (!minutes) return "Time not set";
  if (minutes < 60) return `${minutes} min`;
  if (minutes === 60) return "1 hr";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

function getMaterialLabel(type: string) {
  const labels: Record<string, string> = {
    link: "Link",
    video: "Video",
    document: "Document",
    presentation: "Presentation",
    reading: "Reading",
    other: "Resource",
  };

  return labels[type] ?? "Resource";
}

function getActivityLabel(type: string) {
  const labels: Record<string, string> = {
    practice: "Practice",
    written: "Written Practice",
    case: "Case Study",
    roleplay: "Role Play",
    mock_call: "Mock Call",
    shadowing: "Shadowing",
    other: "Activity",
  };

  return labels[type] ?? "Activity";
}

function getCheckpointLabel(type: string) {
  const labels: Record<string, string> = {
    knowledge: "Knowledge",
    practical: "Practical",
    mock_call: "Mock Call",
    trainer_review: "Trainer Review",
    other: "Checkpoint",
  };

  return labels[type] ?? "Checkpoint";
}

function MaterialCard({
  material,
  index,
  totalMaterials,
  isReordering,
  onMoveUp,
  onMoveDown,
}: {
  material: SupabaseMaterial;
  index: number;
  totalMaterials: number;
  isReordering: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <>
      <div className="rounded-xl border border-[#eaecf0] bg-[#fcfcfd] px-3.5 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-medium text-[#344054]">
                {material.title}
              </p>

              {material.is_required && (
                <span className="text-[10px] font-medium text-[#98a2b3]">
                  Required
                </span>
              )}
            </div>

            {material.description && (
              <p className="mt-0.5 text-xs leading-5 text-[#98a2b3]">
                {material.description}
              </p>
            )}
          </div>

          <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-medium text-[#667085] ring-1 ring-[#eaecf0]">
            {getMaterialLabel(
              material.material_type
            )}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            {material.url ? (
              <a
                href={material.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-[#4169d8] hover:underline"
              >
                Open resource ↗
              </a>
            ) : (
              <p className="text-xs font-medium text-[#b7791f]">
                Resource not added yet
              </p>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={
                index === 0 || isReordering
              }
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e4e7ec] bg-white text-xs font-semibold text-[#475467] transition hover:bg-[#f2f4f7] disabled:cursor-not-allowed disabled:opacity-30"
            >
              ↑
            </button>

            <button
              type="button"
              onClick={onMoveDown}
              disabled={
                index === totalMaterials - 1 ||
                isReordering
              }
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e4e7ec] bg-white text-xs font-semibold text-[#475467] transition hover:bg-[#f2f4f7] disabled:cursor-not-allowed disabled:opacity-30"
            >
              ↓
            </button>

            <button
              type="button"
              onClick={() => setIsEditing(true)}
              disabled={isReordering}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#475467] transition hover:bg-[#f2f4f7] disabled:opacity-50"
            >
              Edit
            </button>
          </div>
        </div>
      </div>

      {isEditing && (
        <MaterialEditor
          material={material}
          onClose={() =>
            setIsEditing(false)
          }
        />
      )}
    </>
  );
}

function ActivityCard({
  activity,
  index,
  totalActivities,
  isReordering,
  onMoveUp,
  onMoveDown,
}: {
  activity: SupabaseActivity;
  index: number;
  totalActivities: number;
  isReordering: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [isEditing, setIsEditing] =
    useState(false);

  return (
    <>
      <div className="rounded-xl border border-[#eaecf0] bg-[#fcfcfd] px-3.5 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-medium text-[#344054]">
                {activity.title}
              </p>

              {activity.is_required && (
                <span className="text-[10px] font-medium text-[#98a2b3]">
                  Required
                </span>
              )}
            </div>

            {activity.description && (
              <p className="mt-0.5 text-xs leading-5 text-[#98a2b3]">
                {activity.description}
              </p>
            )}
          </div>

          <span className="shrink-0 rounded-full bg-[#eef3ff] px-2 py-1 text-[10px] font-medium text-[#4169d8]">
            {getActivityLabel(
              activity.activity_type
            )}
          </span>
        </div>

        {activity.instructions && (
          <div className="mt-3 rounded-lg bg-white px-3 py-2.5 ring-1 ring-[#eef0f3]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#98a2b3]">
              Instructions
            </p>

            <p className="mt-1 text-xs leading-5 text-[#667085]">
              {activity.instructions}
            </p>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-[#98a2b3]">
            {formatDuration(
              activity.duration_minutes
            )}
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={
                index === 0 || isReordering
              }
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e4e7ec] bg-white text-xs font-semibold text-[#475467] transition hover:bg-[#f2f4f7] disabled:cursor-not-allowed disabled:opacity-30"
            >
              ↑
            </button>

            <button
              type="button"
              onClick={onMoveDown}
              disabled={
                index === totalActivities - 1 ||
                isReordering
              }
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e4e7ec] bg-white text-xs font-semibold text-[#475467] transition hover:bg-[#f2f4f7] disabled:cursor-not-allowed disabled:opacity-30"
            >
              ↓
            </button>

            <button
              type="button"
              onClick={() =>
                setIsEditing(true)
              }
              disabled={isReordering}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#475467] transition hover:bg-[#f2f4f7] disabled:opacity-50"
            >
              Edit
            </button>
          </div>
        </div>
      </div>

      {isEditing && (
        <ActivityEditor
          activity={activity}
          onClose={() =>
            setIsEditing(false)
          }
        />
      )}
    </>
  );
}

function QuizCard({
  quiz,
  index,
  totalQuizzes,
  isReordering,
  onMoveUp,
  onMoveDown,
}: {
  quiz: Quiz;
  index: number;
  totalQuizzes: number;
  isReordering: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [isEditing, setIsEditing] =
    useState(false);

  const totalPoints =
    quiz.quiz_questions.reduce(
      (total, question) =>
        total + Number(question.points ?? 0),
      0
    );

  return (
    <>
      <div className="rounded-xl border border-[#ddd6fe] bg-[#faf9ff] px-3.5 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-medium text-[#344054]">
                {quiz.title}
              </p>

              {quiz.is_required && (
                <span className="text-[10px] font-medium text-[#98a2b3]">
                  Required
                </span>
              )}
            </div>

            {quiz.description && (
              <p className="mt-0.5 text-xs leading-5 text-[#98a2b3]">
                {quiz.description}
              </p>
            )}
          </div>

          <span
            className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
              quiz.is_published
                ? "bg-[#ecfdf3] text-[#067647]"
                : "bg-white text-[#667085] ring-1 ring-[#eaecf0]"
            }`}
          >
            {quiz.is_published
              ? "Published"
              : "Draft"}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#667085]">
          <span>
            {quiz.quiz_questions.length}{" "}
            {quiz.quiz_questions.length === 1
              ? "question"
              : "questions"}
          </span>

          <span>•</span>

          <span>{totalPoints} pts</span>

          <span>•</span>

          <span>
            Pass {quiz.passing_score}%
          </span>

          <span>•</span>

          <span>
            {quiz.max_attempts}{" "}
            {quiz.max_attempts === 1
              ? "attempt"
              : "attempts"}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={
              index === 0 || isReordering
            }
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e4e7ec] bg-white text-xs font-semibold text-[#475467] disabled:opacity-30"
          >
            ↑
          </button>

          <button
            type="button"
            onClick={onMoveDown}
            disabled={
              index === totalQuizzes - 1 ||
              isReordering
            }
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e4e7ec] bg-white text-xs font-semibold text-[#475467] disabled:opacity-30"
          >
            ↓
          </button>

          <button
            type="button"
            onClick={() =>
              setIsEditing(true)
            }
            disabled={isReordering}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#6847df] hover:bg-[#f3f0ff] disabled:opacity-50"
          >
            Edit quiz
          </button>
        </div>
      </div>

      {isEditing && (
        <QuizEditor
          quiz={quiz}
          onClose={() =>
            setIsEditing(false)
          }
        />
      )}
    </>
  );
}

function CheckpointCard({
  checkpoint,
  index,
  totalCheckpoints,
  isReordering,
  onMoveUp,
  onMoveDown,
}: {
  checkpoint: SupabaseCheckpoint;
  index: number;
  totalCheckpoints: number;
  isReordering: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [isEditing, setIsEditing] =
    useState(false);

  return (
    <>
      <div className="rounded-[18px] border border-[#e5e7eb] bg-white p-5">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#f3f0ff] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#6847df]">
                {getCheckpointLabel(
                  checkpoint.checkpoint_type
                )}
              </span>

              {checkpoint.passing_score !==
                null && (
                <span className="text-xs text-[#98a2b3]">
                  Passing score:{" "}
                  {checkpoint.passing_score}%
                </span>
              )}
            </div>

            <h3 className="mt-3 text-[15px] font-semibold text-[#172033]">
              {checkpoint.title}
            </h3>

            {checkpoint.description && (
              <p className="mt-1 text-sm leading-5 text-[#667085]">
                {checkpoint.description}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={
                index === 0 || isReordering
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e4e7ec] bg-white text-xs font-semibold text-[#475467] disabled:opacity-30"
            >
              ↑
            </button>

            <button
              type="button"
              onClick={onMoveDown}
              disabled={
                index ===
                  totalCheckpoints - 1 ||
                isReordering
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e4e7ec] bg-white text-xs font-semibold text-[#475467] disabled:opacity-30"
            >
              ↓
            </button>

            <button
              type="button"
              onClick={() =>
                setIsEditing(true)
              }
              disabled={isReordering}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#475467] hover:bg-[#f2f4f7] disabled:opacity-50"
            >
              Edit
            </button>
          </div>
        </div>
      </div>

      {isEditing && (
        <CheckpointEditor
          checkpoint={checkpoint}
          onClose={() =>
            setIsEditing(false)
          }
        />
      )}
    </>
  );
}

function ModuleCard({
  module,
  index,
  totalModules,
  isReordering,
  onMoveUp,
  onMoveDown,
  onMoveMaterial,
  onMoveActivity,
  onMoveQuiz,
}: {
  module: SupabaseModule;
  index: number;
  totalModules: number;
  isReordering: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveMaterial: (
    module: SupabaseModule,
    materialIndex: number,
    direction: MoveDirection
  ) => void;
  onMoveActivity: (
    module: SupabaseModule,
    activityIndex: number,
    direction: MoveDirection
  ) => void;
  onMoveQuiz: (
    module: SupabaseModule,
    quizIndex: number,
    direction: MoveDirection
  ) => void;
}) {
  const [isEditing, setIsEditing] =
    useState(false);
  const [
    isAddingMaterial,
    setIsAddingMaterial,
  ] = useState(false);
  const [
    isAddingActivity,
    setIsAddingActivity,
  ] = useState(false);
  const [isAddingQuiz, setIsAddingQuiz] =
    useState(false);

  return (
    <>
      <div className="rounded-[18px] border border-[#e5e7eb] bg-white">
        <div className="flex items-start gap-4 p-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eef3ff] text-xs font-semibold text-[#4169d8]">
            {index + 1}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[15px] font-semibold text-[#172033]">
                    {module.title}
                  </h3>

                  {module.is_required && (
                    <span className="rounded-full bg-[#f2f4f7] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#667085]">
                      Required
                    </span>
                  )}
                </div>

                {module.description && (
                  <p className="mt-1.5 text-sm leading-5 text-[#667085]">
                    {module.description}
                  </p>
                )}
              </div>

              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  module.duration_minutes
                    ? "bg-[#f2f4f7] text-[#667085]"
                    : "bg-[#fff8e7] text-[#b7791f]"
                }`}
              >
                {formatDuration(
                  module.duration_minutes
                )}
              </span>
            </div>

            {module.objective && (
              <div className="mt-4 rounded-xl bg-[#f9fafb] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                  Learning objective
                </p>

                <p className="mt-1.5 text-sm leading-5 text-[#475467]">
                  {module.objective}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-[#eef0f3] px-5 py-4">
          <div className="grid gap-5 xl:grid-cols-3">
            {/* MATERIALS */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                  Materials
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setIsAddingMaterial(true)
                  }
                  disabled={isReordering}
                  className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[#4169d8] hover:bg-[#eef3ff] disabled:opacity-50"
                >
                  + Add
                </button>
              </div>

              {module.materials.length > 0 ? (
                <div className="space-y-2">
                  {module.materials.map(
                    (material, materialIndex) => (
                      <MaterialCard
                        key={material.id}
                        material={material}
                        index={materialIndex}
                        totalMaterials={
                          module.materials.length
                        }
                        isReordering={
                          isReordering
                        }
                        onMoveUp={() =>
                          onMoveMaterial(
                            module,
                            materialIndex,
                            "up"
                          )
                        }
                        onMoveDown={() =>
                          onMoveMaterial(
                            module,
                            materialIndex,
                            "down"
                          )
                        }
                      />
                    )
                  )}
                </div>
              ) : (
                <EmptyBox text="No materials yet." />
              )}
            </div>

            {/* PRACTICE */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                  Practice
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setIsAddingActivity(true)
                  }
                  disabled={isReordering}
                  className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[#4169d8] hover:bg-[#eef3ff] disabled:opacity-50"
                >
                  + Add
                </button>
              </div>

              {module.activities.length > 0 ? (
                <div className="space-y-2">
                  {module.activities.map(
                    (activity, activityIndex) => (
                      <ActivityCard
                        key={activity.id}
                        activity={activity}
                        index={activityIndex}
                        totalActivities={
                          module.activities.length
                        }
                        isReordering={
                          isReordering
                        }
                        onMoveUp={() =>
                          onMoveActivity(
                            module,
                            activityIndex,
                            "up"
                          )
                        }
                        onMoveDown={() =>
                          onMoveActivity(
                            module,
                            activityIndex,
                            "down"
                          )
                        }
                      />
                    )
                  )}
                </div>
              ) : (
                <EmptyBox text="No practice yet." />
              )}
            </div>

            {/* QUIZZES */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                  Quizzes
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setIsAddingQuiz(true)
                  }
                  disabled={isReordering}
                  className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[#6847df] hover:bg-[#f3f0ff] disabled:opacity-50"
                >
                  + Add
                </button>
              </div>

              {module.quizzes.length > 0 ? (
                <div className="space-y-2">
                  {module.quizzes.map(
                    (quiz, quizIndex) => (
                      <QuizCard
                        key={quiz.id}
                        quiz={quiz}
                        index={quizIndex}
                        totalQuizzes={
                          module.quizzes.length
                        }
                        isReordering={
                          isReordering
                        }
                        onMoveUp={() =>
                          onMoveQuiz(
                            module,
                            quizIndex,
                            "up"
                          )
                        }
                        onMoveDown={() =>
                          onMoveQuiz(
                            module,
                            quizIndex,
                            "down"
                          )
                        }
                      />
                    )
                  )}
                </div>
              ) : (
                <EmptyBox text="No quizzes yet." />
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eef0f3] px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="mr-1 text-xs text-[#98a2b3]">
              Module {index + 1}
            </span>

            <button
              type="button"
              onClick={onMoveUp}
              disabled={
                index === 0 || isReordering
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e4e7ec] bg-white text-sm font-semibold text-[#475467] disabled:opacity-30"
            >
              ↑
            </button>

            <button
              type="button"
              onClick={onMoveDown}
              disabled={
                index === totalModules - 1 ||
                isReordering
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e4e7ec] bg-white text-sm font-semibold text-[#475467] disabled:opacity-30"
            >
              ↓
            </button>

            {isReordering && (
              <span className="text-[11px] text-[#98a2b3]">
                Saving order...
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              setIsEditing(true)
            }
            disabled={isReordering}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#475467] hover:bg-[#f2f4f7] disabled:opacity-50"
          >
            Edit module
          </button>
        </div>

        {isEditing && (
          <ModuleEditor
            module={module}
            onClose={() =>
              setIsEditing(false)
            }
          />
        )}
      </div>

      {isAddingMaterial && (
        <AddMaterialEditor
          moduleId={module.id}
          nextPosition={
            module.materials.length + 1
          }
          onClose={() =>
            setIsAddingMaterial(false)
          }
        />
      )}

      {isAddingActivity && (
        <AddActivityEditor
          moduleId={module.id}
          nextPosition={
            module.activities.length + 1
          }
          onClose={() =>
            setIsAddingActivity(false)
          }
        />
      )}

      {isAddingQuiz && (
        <AddQuizEditor
          moduleId={module.id}
          nextPosition={
            module.quizzes.length + 1
          }
          onClose={() =>
            setIsAddingQuiz(false)
          }
        />
      )}
    </>
  );
}

function EmptyBox({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#d0d5dd] bg-[#fcfcfd] px-3.5 py-4">
      <p className="text-xs text-[#98a2b3]">
        {text}
      </p>
    </div>
  );
}

export default function DayEditor({
  day,
  dayNumber,
  title,
  description,
  onClose,
}: DayEditorProps) {
  const router = useRouter();
  const supabase = createClient();
  const activeDay = day;

  const [
    isAddingModule,
    setIsAddingModule,
  ] = useState(false);
  const [
    isAddingCheckpoint,
    setIsAddingCheckpoint,
  ] = useState(false);
  const [isEditingDay, setIsEditingDay] =
    useState(false);
  const [isReordering, setIsReordering] =
    useState(false);
  const [reorderError, setReorderError] =
    useState<string | null>(null);

  async function swapPositions(
    table: ReorderTable,
    currentId: string,
    currentPosition: number,
    targetId: string,
    targetPosition: number
  ) {
    const temporaryCurrentPosition = -100001;
    const temporaryTargetPosition = -100002;

    const { error: firstTempError } =
      await supabase
        .from(table)
        .update({
          position:
            temporaryCurrentPosition,
        })
        .eq("id", currentId);

    if (firstTempError) {
      console.error(
        `Error preparing ${table} reorder:`,
        firstTempError
      );
      return false;
    }

    const { error: secondTempError } =
      await supabase
        .from(table)
        .update({
          position:
            temporaryTargetPosition,
        })
        .eq("id", targetId);

    if (secondTempError) {
      await supabase
        .from(table)
        .update({
          position: currentPosition,
        })
        .eq("id", currentId);

      return false;
    }

    const { error: firstFinalError } =
      await supabase
        .from(table)
        .update({
          position: targetPosition,
        })
        .eq("id", currentId);

    if (firstFinalError) {
      return false;
    }

    const { error: secondFinalError } =
      await supabase
        .from(table)
        .update({
          position: currentPosition,
        })
        .eq("id", targetId);

    if (secondFinalError) {
      return false;
    }

    return true;
  }

  async function moveItem(
    table: ReorderTable,
    items: {
      id: string;
      position: number;
    }[],
    index: number,
    direction: MoveDirection,
    errorMessage: string
  ) {
    if (isReordering) return;

    const targetIndex =
      direction === "up"
        ? index - 1
        : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= items.length
    ) {
      return;
    }

    const current = items[index];
    const target = items[targetIndex];

    setIsReordering(true);
    setReorderError(null);

    const success = await swapPositions(
      table,
      current.id,
      current.position,
      target.id,
      target.position
    );

    if (!success) {
      setReorderError(errorMessage);
    }

    setIsReordering(false);
    router.refresh();
  }

  function handleMoveModule(
    index: number,
    direction: MoveDirection
  ) {
    if (!activeDay) return;

    return moveItem(
      "modules",
      activeDay.modules,
      index,
      direction,
      "We couldn't change the module order. Please try again."
    );
  }

  function handleMoveMaterial(
    module: SupabaseModule,
    index: number,
    direction: MoveDirection
  ) {
    return moveItem(
      "materials",
      module.materials,
      index,
      direction,
      "We couldn't change the material order. Please try again."
    );
  }

  function handleMoveActivity(
    module: SupabaseModule,
    index: number,
    direction: MoveDirection
  ) {
    return moveItem(
      "activities",
      module.activities,
      index,
      direction,
      "We couldn't change the activity order. Please try again."
    );
  }

  function handleMoveQuiz(
    module: SupabaseModule,
    index: number,
    direction: MoveDirection
  ) {
    return moveItem(
      "quizzes",
      module.quizzes,
      index,
      direction,
      "We couldn't change the quiz order. Please try again."
    );
  }

  function handleMoveCheckpoint(
    index: number,
    direction: MoveDirection
  ) {
    if (!activeDay) return;

    return moveItem(
      "checkpoints",
      activeDay.checkpoints,
      index,
      direction,
      "We couldn't change the checkpoint order. Please try again."
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-[1px]">
      <div className="h-full w-full max-w-[1040px] overflow-y-auto border-l border-[#e5e7eb] bg-[#f7f8fa] shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-[#e9ebef] bg-white/95 px-8 py-6 backdrop-blur">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-[#eef3ff] px-2.5 py-1 text-xs font-semibold text-[#4169d8]">
                  Day {dayNumber}
                </span>

                <span className="rounded-full border border-[#e4e7ec] px-2.5 py-1 text-xs font-medium capitalize text-[#667085]">
                  {activeDay?.is_published
                    ? "Published"
                    : "Draft"}
                </span>
              </div>

              <h2 className="text-2xl font-semibold tracking-[-0.025em] text-[#172033]">
                {activeDay?.title ?? title}
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
                {activeDay?.description ??
                  description}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {activeDay && (
                <button
                  type="button"
                  onClick={() =>
                    setIsEditingDay(true)
                  }
                  className="rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2 text-xs font-semibold text-[#475467] hover:bg-[#f7f8fa]"
                >
                  Edit day
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e4e7ec] bg-white text-lg text-[#667085] hover:bg-[#f7f8fa]"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <div className="p-8">
          {activeDay ? (
            <>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                    Day content
                  </p>

                  <p className="mt-1 text-sm text-[#667085]">
                    {activeDay.modules.length}{" "}
                    {activeDay.modules.length === 1
                      ? "module"
                      : "modules"}{" "}
                    ·{" "}
                    {
                      activeDay.checkpoints
                        .length
                    }{" "}
                    {activeDay.checkpoints
                      .length === 1
                      ? "checkpoint"
                      : "checkpoints"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setIsAddingModule(true)
                  }
                  disabled={isReordering}
                  className="rounded-xl bg-[#172033] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#263247] disabled:opacity-50"
                >
                  + Add module
                </button>
              </div>

              {reorderError && (
                <div className="mb-4 rounded-xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3">
                  <p className="text-sm text-[#b42318]">
                    {reorderError}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {activeDay.modules.map(
                  (module, index) => (
                    <ModuleCard
                      key={module.id}
                      module={module}
                      index={index}
                      totalModules={
                        activeDay.modules
                          .length
                      }
                      isReordering={
                        isReordering
                      }
                      onMoveUp={() =>
                        handleMoveModule(
                          index,
                          "up"
                        )
                      }
                      onMoveDown={() =>
                        handleMoveModule(
                          index,
                          "down"
                        )
                      }
                      onMoveMaterial={
                        handleMoveMaterial
                      }
                      onMoveActivity={
                        handleMoveActivity
                      }
                      onMoveQuiz={
                        handleMoveQuiz
                      }
                    />
                  )
                )}
              </div>

              <div className="mt-8">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                      Checkpoints
                    </p>

                    <p className="mt-1 text-sm text-[#667085]">
                      Evaluate understanding before
                      learners continue.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setIsAddingCheckpoint(
                        true
                      )
                    }
                    disabled={isReordering}
                    className="rounded-lg px-3 py-2 text-xs font-semibold text-[#6847df] hover:bg-[#f3f0ff] disabled:opacity-50"
                  >
                    + Add checkpoint
                  </button>
                </div>

                {activeDay.checkpoints.length >
                0 ? (
                  <div className="space-y-3">
                    {activeDay.checkpoints.map(
                      (
                        checkpoint,
                        index
                      ) => (
                        <CheckpointCard
                          key={
                            checkpoint.id
                          }
                          checkpoint={
                            checkpoint
                          }
                          index={index}
                          totalCheckpoints={
                            activeDay
                              .checkpoints
                              .length
                          }
                          isReordering={
                            isReordering
                          }
                          onMoveUp={() =>
                            handleMoveCheckpoint(
                              index,
                              "up"
                            )
                          }
                          onMoveDown={() =>
                            handleMoveCheckpoint(
                              index,
                              "down"
                            )
                          }
                        />
                      )
                    )}
                  </div>
                ) : (
                  <div className="rounded-[18px] border border-dashed border-[#d0d5dd] bg-white px-5 py-6 text-center">
                    <p className="text-sm text-[#98a2b3]">
                      No checkpoints have been
                      added yet.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-[18px] border border-dashed border-[#d0d5dd] bg-white px-6 py-12 text-center">
              <p className="text-sm font-medium text-[#344054]">
                Day {dayNumber} content is
                coming next.
              </p>
            </div>
          )}
        </div>
      </div>

      {isAddingModule && activeDay && (
        <AddModuleEditor
          dayId={activeDay.id}
          nextPosition={
            activeDay.modules.length + 1
          }
          onClose={() =>
            setIsAddingModule(false)
          }
        />
      )}

      {isAddingCheckpoint &&
        activeDay && (
          <AddCheckpointEditor
            dayId={activeDay.id}
            nextPosition={
              activeDay.checkpoints
                .length + 1
            }
            onClose={() =>
              setIsAddingCheckpoint(
                false
              )
            }
          />
        )}

      {isEditingDay && activeDay && (
        <DaySettingsEditor
          day={activeDay}
          onClose={() =>
            setIsEditingDay(false)
          }
        />
      )}
    </div>
  );
}