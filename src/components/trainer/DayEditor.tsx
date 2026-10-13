"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  resource_url: string | null;
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

type CheckpointType =
  | "assessment"
  | "trainer_session"
  | "information";

type SupabaseCheckpoint = {
  id: string;
  quiz_id: string | null;
  title: string;
  description: string | null;
  checkpoint_type: CheckpointType;
  passing_score: number | null;
  position: number;
  is_required: boolean;
  meeting_url: string | null;
  scheduled_at: string | null;
  duration_minutes: number | null;
  quizzes: Quiz[];
};

type DayContent = {
  id: string;
  content_type: "module" | "checkpoint";
  content_id: string;
  position: number;
};

type SupabaseDay = {
  id: string;
  day_number: number;
  title: string;
  description: string | null;
  position: number;
  is_published: boolean;
  day_content: DayContent[];
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
  | "materials"
  | "activities"
  | "quizzes";

type RenderedDayContent =
  | {
      dayContent: DayContent;
      type: "module";
      module: SupabaseModule;
    }
  | {
      dayContent: DayContent;
      type: "checkpoint";
      checkpoint: SupabaseCheckpoint;
    };

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

function formatSessionDate(value: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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

function getCheckpointPresentation(type: CheckpointType) {
  if (type === "trainer_session") {
    return {
      label: "Live Session",
      eyebrow: "Trainer Session",
      badge:
        "border-[#B9E8EE] bg-[#F0FAFB] text-[#08788A]",
      accent: "bg-[#08A9C1]",
    };
  }

  if (type === "information") {
    return {
      label: "Information",
      eyebrow: "Information",
      badge:
        "border-[#DDE3EA] bg-[#F8FAFC] text-[#475467]",
      accent: "bg-[#667085]",
    };
  }

  return {
    label: "Checkpoint",
    eyebrow: "Assessment",
    badge:
      "border-[#B9E8EE] bg-[#F0FAFB] text-[#08788A]",
    accent: "bg-[#08A9C1]",
  };
}

function OrderButton({
  direction,
  onClick,
  disabled,
}: {
  direction: MoveDirection;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e4e7ec] bg-white text-sm font-semibold text-[#475467] transition hover:border-[#B9E8EE] hover:bg-[#F0FAFB] hover:text-[#07879B] disabled:cursor-not-allowed disabled:opacity-30"
      aria-label={
        direction === "up"
          ? "Move up"
          : "Move down"
      }
    >
      {direction === "up" ? "↑" : "↓"}
    </button>
  );
}

function DragHandle({
  attributes,
  listeners,
  disabled,
}: {
  attributes: Record<string, unknown>;
  listeners: Record<string, unknown> | undefined;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      disabled={disabled}
      className="group flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl border border-[#e4e7ec] bg-white text-[#98a2b3] transition hover:border-[#B9E8EE] hover:bg-[#F0FAFB] hover:text-[#07879B] active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
      aria-label="Drag to reorder"
      title="Drag to reorder"
    >
      <span className="text-[18px] font-bold leading-none tracking-[-4px]">
        ⠿
      </span>
    </button>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#d0d5dd] bg-[#fcfcfd] px-3.5 py-4">
      <p className="text-xs text-[#98a2b3]">
        {text}
      </p>
    </div>
  );
}

function SectionHeader({
  title,
  onAdd,
  disabled,
}: {
  title: string;
  onAdd: () => void;
  disabled: boolean;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
        {title}
      </p>

      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[#07879B] hover:bg-[#F0FAFB] disabled:opacity-50"
      >
        + Add
      </button>
    </div>
  );
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
              <p className="mt-0.5 whitespace-pre-wrap text-xs leading-5 text-[#98a2b3]">
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
                className="text-xs font-medium text-[#07879B] hover:underline"
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
            <OrderButton
              direction="up"
              onClick={onMoveUp}
              disabled={
                index === 0 ||
                isReordering
              }
            />

            <OrderButton
              direction="down"
              onClick={onMoveDown}
              disabled={
                index ===
                  totalMaterials - 1 ||
                isReordering
              }
            />

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
  const [isEditing, setIsEditing] = useState(false);

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
              <p className="mt-0.5 whitespace-pre-wrap text-xs leading-5 text-[#98a2b3]">
                {activity.description}
              </p>
            )}
          </div>

          <span className="shrink-0 rounded-full bg-[#F0FAFB] px-2 py-1 text-[10px] font-medium text-[#08788A]">
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

            <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[#667085]">
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
            <OrderButton
              direction="up"
              onClick={onMoveUp}
              disabled={
                index === 0 ||
                isReordering
              }
            />

            <OrderButton
              direction="down"
              onClick={onMoveDown}
              disabled={
                index ===
                  totalActivities - 1 ||
                isReordering
              }
            />

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
  const [isEditing, setIsEditing] = useState(false);

  const totalPoints =
    quiz.quiz_questions.reduce(
      (total, question) =>
        total +
        Number(question.points ?? 0),
      0
    );

  return (
    <>
      <div className="rounded-xl border border-[#B9E8EE] bg-[#FAFEFF] px-3.5 py-3">
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
              <p className="mt-0.5 whitespace-pre-wrap text-xs leading-5 text-[#98a2b3]">
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
            {quiz.quiz_questions.length ===
            1
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
          <OrderButton
            direction="up"
            onClick={onMoveUp}
            disabled={
              index === 0 ||
              isReordering
            }
          />

          <OrderButton
            direction="down"
            onClick={onMoveDown}
            disabled={
              index ===
                totalQuizzes - 1 ||
              isReordering
            }
          />

          <button
            type="button"
            onClick={() =>
              setIsEditing(true)
            }
            disabled={isReordering}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#07879B] hover:bg-[#F0FAFB] disabled:opacity-50"
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

function ModuleCard({
  module,
  moduleNumber,
  isReordering,
  dragHandle,
  onMoveMaterial,
  onMoveActivity,
  onMoveQuiz,
}: {
  module: SupabaseModule;
  moduleNumber: number;
  isReordering: boolean;
  dragHandle?: React.ReactNode;
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
      <div className="overflow-hidden rounded-[18px] border border-[#e5e7eb] bg-white">
        <div className="flex items-start gap-4 p-5">
          <div className="flex shrink-0 items-center gap-2">
            {dragHandle}

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F0FAFB] text-xs font-semibold text-[#08788A]">
              {moduleNumber}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#08A9C1]">
                    Module
                  </span>

                  {module.is_required && (
                    <span className="rounded-full bg-[#f2f4f7] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#667085]">
                      Required
                    </span>
                  )}
                </div>

                <h3 className="mt-1 text-[15px] font-semibold text-[#172033]">
                  {module.title}
                </h3>

                {module.description && (
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-5 text-[#667085]">
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

                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-5 text-[#475467]">
                  {module.objective}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-[#eef0f3] px-5 py-4">
          <div className="grid gap-5 xl:grid-cols-3">
            <div>
              <SectionHeader
                title="Materials"
                onAdd={() =>
                  setIsAddingMaterial(true)
                }
                disabled={isReordering}
              />

              {module.materials.length >
              0 ? (
                <div className="space-y-2">
                  {module.materials.map(
                    (
                      material,
                      materialIndex
                    ) => (
                      <MaterialCard
                        key={material.id}
                        material={material}
                        index={
                          materialIndex
                        }
                        totalMaterials={
                          module.materials
                            .length
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

            <div>
              <SectionHeader
                title="Practice"
                onAdd={() =>
                  setIsAddingActivity(true)
                }
                disabled={isReordering}
              />

              {module.activities.length >
              0 ? (
                <div className="space-y-2">
                  {module.activities.map(
                    (
                      activity,
                      activityIndex
                    ) => (
                      <ActivityCard
                        key={activity.id}
                        activity={activity}
                        index={
                          activityIndex
                        }
                        totalActivities={
                          module.activities
                            .length
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

            <div>
              <SectionHeader
                title="Quizzes"
                onAdd={() =>
                  setIsAddingQuiz(true)
                }
                disabled={isReordering}
              />

              {module.quizzes.length >
              0 ? (
                <div className="space-y-2">
                  {module.quizzes.map(
                    (quiz, quizIndex) => (
                      <QuizCard
                        key={quiz.id}
                        quiz={quiz}
                        index={quizIndex}
                        totalQuizzes={
                          module.quizzes
                            .length
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
            <span className="text-xs text-[#98a2b3]">
              Module {moduleNumber}
            </span>

            <span className="text-[11px] text-[#c0c6cf]">
              Drag the handle to reorder
            </span>
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
      </div>

      {isEditing && (
        <ModuleEditor
          module={module}
          onClose={() =>
            setIsEditing(false)
          }
        />
      )}

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

function CheckpointCard({
  checkpoint,
  contentIndex,
  isReordering,
  dragHandle,
}: {
  checkpoint: SupabaseCheckpoint;
  contentIndex: number;
  isReordering: boolean;
  dragHandle?: React.ReactNode;
}) {
  const [isEditing, setIsEditing] =
    useState(false);

  const presentation =
    getCheckpointPresentation(
      checkpoint.checkpoint_type
    );

  const scheduledLabel =
    checkpoint.checkpoint_type ===
    "trainer_session"
      ? formatSessionDate(
          checkpoint.scheduled_at
        )
      : null;

  const questionCount =
    checkpoint.quizzes?.[0]
      ?.quiz_questions?.length ?? 0;

  return (
    <>
      <div className="relative overflow-hidden rounded-[18px] border border-[#dfe5e8] bg-white">
        <div
          className={`absolute inset-y-0 left-0 w-1 ${presentation.accent}`}
        />

        <div className="p-5 pl-6">
          <div className="flex items-start gap-4">
            {dragHandle}

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] ${presentation.badge}`}
                    >
                      {presentation.label}
                    </span>

                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                      {
                        presentation.eyebrow
                      }
                    </span>

                    {checkpoint.is_required &&
                      checkpoint.checkpoint_type !==
                        "information" && (
                        <span className="text-[10px] font-medium text-[#98a2b3]">
                          Required
                        </span>
                      )}
                  </div>

                  <h3 className="mt-3 text-[15px] font-semibold text-[#172033]">
                    {checkpoint.title}
                  </h3>

                  {checkpoint.description && (
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-[#667085]">
                      {
                        checkpoint.description
                      }
                    </p>
                  )}

                  {checkpoint.checkpoint_type ===
                    "assessment" && (
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#667085]">
                      <span>
                        {questionCount}{" "}
                        {questionCount === 1
                          ? "question"
                          : "questions"}
                      </span>

                      {checkpoint.passing_score !==
                        null && (
                        <>
                          <span>•</span>
                          <span>
                            Pass{" "}
                            {
                              checkpoint.passing_score
                            }
                            %
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {checkpoint.checkpoint_type ===
                    "trainer_session" && (
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[#667085]">
                      <span>
                        {scheduledLabel ??
                          "Date and time not set"}
                      </span>

                      {checkpoint.duration_minutes && (
                        <>
                          <span>•</span>
                          <span>
                            {formatDuration(
                              checkpoint.duration_minutes
                            )}
                          </span>
                        </>
                      )}

                      {checkpoint.meeting_url && (
                        <>
                          <span>•</span>
                          <a
                            href={
                              checkpoint.meeting_url
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-[#07879B] hover:underline"
                          >
                            Open meeting ↗
                          </a>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setIsEditing(true)
                  }
                  disabled={isReordering}
                  className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#475467] hover:bg-[#f2f4f7] disabled:opacity-50"
                >
                  Edit
                </button>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-[#eef0f3] pt-3">
                <span className="text-xs text-[#98a2b3]">
                  Day item{" "}
                  {contentIndex + 1}
                </span>

                <span className="text-[11px] text-[#c0c6cf]">
                  Drag the handle to
                  reorder
                </span>
              </div>
            </div>
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

function SortableDayItem({
  item,
  moduleNumber,
  contentIndex,
  isReordering,
  onMoveMaterial,
  onMoveActivity,
  onMoveQuiz,
}: {
  item: RenderedDayContent;
  moduleNumber?: number;
  contentIndex: number;
  isReordering: boolean;
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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.dayContent.id,
    disabled: isReordering,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(
      transform
    ),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 20 : undefined,
  };

  const dragHandle = (
    <DragHandle
      attributes={
        attributes as unknown as Record<
          string,
          unknown
        >
      }
      listeners={
        listeners as unknown as
          | Record<string, unknown>
          | undefined
      }
      disabled={isReordering}
    />
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        isDragging
          ? "relative rounded-[18px]"
          : ""
      }
    >
      {item.type === "module" ? (
        <ModuleCard
          module={item.module}
          moduleNumber={
            moduleNumber ?? 1
          }
          isReordering={isReordering}
          dragHandle={dragHandle}
          onMoveMaterial={onMoveMaterial}
          onMoveActivity={onMoveActivity}
          onMoveQuiz={onMoveQuiz}
        />
      ) : (
        <CheckpointCard
          checkpoint={item.checkpoint}
          contentIndex={contentIndex}
          isReordering={isReordering}
          dragHandle={dragHandle}
        />
      )}
    </div>
  );
}

function DragPreview({
  item,
}: {
  item: RenderedDayContent | null;
}) {
  if (!item) return null;

  const isModule =
    item.type === "module";

  const title = isModule
    ? item.module.title
    : item.checkpoint.title;

  const label = isModule
    ? "Module"
    : getCheckpointPresentation(
        item.checkpoint.checkpoint_type
      ).label;

  return (
    <div className="w-[min(720px,calc(100vw-48px))] rounded-[18px] border border-[#B9E8EE] bg-white px-5 py-4 shadow-2xl ring-2 ring-[#08A9C1]/10">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F0FAFB] text-[#07879B]">
          ⠿
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#08A9C1]">
            {label}
          </p>

          <p className="mt-0.5 truncate text-sm font-semibold text-[#172033]">
            {title}
          </p>
        </div>
      </div>
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

  const [
    isEditingDay,
    setIsEditingDay,
  ] = useState(false);

  const [
    isReordering,
    setIsReordering,
  ] = useState(false);

  const [
    reorderError,
    setReorderError,
  ] = useState<string | null>(null);

  const [
    activeDragId,
    setActiveDragId,
  ] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  );

  const orderedContent = useMemo<
    RenderedDayContent[]
  >(() => {
    if (!activeDay) return [];

    const moduleMap = new Map<
      string,
      SupabaseModule
    >(
      activeDay.modules.map((module) => [
        module.id,
        module,
      ])
    );

    const checkpointMap = new Map<
      string,
      SupabaseCheckpoint
    >(
      activeDay.checkpoints.map(
        (checkpoint) => [
          checkpoint.id,
          checkpoint,
        ]
      )
    );

    const result: RenderedDayContent[] =
      [];

    const sortedDayContent = [
      ...(activeDay.day_content ?? []),
    ].sort(
      (a, b) =>
        a.position - b.position
    );

    for (const item of sortedDayContent) {
      if (
        item.content_type === "module"
      ) {
        const module = moduleMap.get(
          item.content_id
        );

        if (module) {
          result.push({
            dayContent: item,
            type: "module",
            module,
          });
        }

        continue;
      }

      if (
        item.content_type ===
        "checkpoint"
      ) {
        const checkpoint =
          checkpointMap.get(
            item.content_id
          );

        if (checkpoint) {
          result.push({
            dayContent: item,
            type: "checkpoint",
            checkpoint,
          });
        }
      }
    }

    return result;
  }, [activeDay]);

  const moduleNumbers = useMemo(() => {
    const map = new Map<
      string,
      number
    >();

    let count = 0;

    for (const item of orderedContent) {
      if (item.type === "module") {
        count += 1;
        map.set(item.module.id, count);
      }
    }

    return map;
  }, [orderedContent]);

  const sortableIds = useMemo(
    () =>
      orderedContent.map(
        (item) => item.dayContent.id
      ),
    [orderedContent]
  );

  const activeDragItem =
    useMemo(() => {
      if (!activeDragId) return null;

      return (
        orderedContent.find(
          (item) =>
            item.dayContent.id ===
            activeDragId
        ) ?? null
      );
    }, [
      activeDragId,
      orderedContent,
    ]);

  async function swapPositions(
    table: ReorderTable,
    currentId: string,
    currentPosition: number,
    targetId: string,
    targetPosition: number
  ) {
    const temporaryCurrentPosition =
      -100001;
    const temporaryTargetPosition =
      -100002;

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

    const {
      error: secondTempError,
    } = await supabase
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

    const {
      error: firstFinalError,
    } = await supabase
      .from(table)
      .update({
        position: targetPosition,
      })
      .eq("id", currentId);

    if (firstFinalError) {
      return false;
    }

    const {
      error: secondFinalError,
    } = await supabase
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

  async function moveNestedItem(
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

    const success =
      await swapPositions(
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

  function handleMoveMaterial(
    module: SupabaseModule,
    index: number,
    direction: MoveDirection
  ) {
    return moveNestedItem(
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
    return moveNestedItem(
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
    return moveNestedItem(
      "quizzes",
      module.quizzes,
      index,
      direction,
      "We couldn't change the quiz order. Please try again."
    );
  }

  function handleDragStart(
    event: DragStartEvent
  ) {
    setActiveDragId(
      String(event.active.id)
    );
    setReorderError(null);
  }

  async function handleDragEnd(
    event: DragEndEvent
  ) {
    setActiveDragId(null);

    const activeId = String(
      event.active.id
    );

    const overId = event.over
      ? String(event.over.id)
      : null;

    if (
      !overId ||
      activeId === overId ||
      isReordering
    ) {
      return;
    }

    const oldIndex =
      orderedContent.findIndex(
        (item) =>
          item.dayContent.id ===
          activeId
      );

    const newIndex =
      orderedContent.findIndex(
        (item) =>
          item.dayContent.id ===
          overId
      );

    if (
      oldIndex === -1 ||
      newIndex === -1 ||
      oldIndex === newIndex
    ) {
      return;
    }

    setIsReordering(true);
    setReorderError(null);

    const direction: MoveDirection =
      newIndex > oldIndex
        ? "down"
        : "up";

    const totalMoves = Math.abs(
      newIndex - oldIndex
    );

    let failed = false;

    for (
      let move = 0;
      move < totalMoves;
      move += 1
    ) {
      const { error } =
        await supabase.rpc(
          "move_day_content",
          {
            target_day_content_id:
              activeId,
            move_direction:
              direction,
          }
        );

      if (error) {
        console.error(
          "Error reordering day content:",
          error
        );

        failed = true;
        break;
      }
    }

    if (failed) {
      setReorderError(
        "We couldn't change the day content order. Please try again."
      );
    }

    setIsReordering(false);
    router.refresh();
  }

  function handleDragCancel() {
    setActiveDragId(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-[1px]">
      <div className="h-full w-full max-w-[1040px] overflow-y-auto border-l border-[#e5e7eb] bg-[#f7f8fa] shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-[#e9ebef] bg-white/95 px-8 py-6 backdrop-blur">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-[#F0FAFB] px-2.5 py-1 text-xs font-semibold text-[#08788A]">
                  Day {dayNumber}
                </span>

                <span className="rounded-full border border-[#e4e7ec] px-2.5 py-1 text-xs font-medium capitalize text-[#667085]">
                  {activeDay?.is_published
                    ? "Published"
                    : "Draft"}
                </span>
              </div>

              <h2 className="text-2xl font-semibold tracking-[-0.025em] text-[#172033]">
                {activeDay?.title ??
                  title}
              </h2>

              <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-[#667085]">
                {activeDay?.description ??
                  description}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {activeDay && (
                <button
                  type="button"
                  onClick={() =>
                    setIsEditingDay(
                      true
                    )
                  }
                  disabled={
                    isReordering
                  }
                  className="rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2 text-xs font-semibold text-[#475467] hover:bg-[#f7f8fa] disabled:opacity-50"
                >
                  Edit day
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                disabled={isReordering}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e4e7ec] bg-white text-lg text-[#667085] hover:bg-[#f7f8fa] disabled:opacity-50"
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
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#07879B]">
                    Day content
                  </p>

                  <p className="mt-1 text-sm text-[#667085]">
                    {
                      activeDay.modules
                        .length
                    }{" "}
                    {activeDay.modules
                      .length === 1
                      ? "module"
                      : "modules"}{" "}
                    ·{" "}
                    {
                      activeDay
                        .checkpoints
                        .length
                    }{" "}
                    {activeDay.checkpoints
                      .length === 1
                      ? "checkpoint"
                      : "checkpoints"}
                  </p>

                  <p className="mt-1 text-xs text-[#98a2b3]">
                    Drag any module,
                    checkpoint, live
                    session or information
                    block to change the
                    trainee journey.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setIsAddingCheckpoint(
                        true
                      )
                    }
                    disabled={
                      isReordering
                    }
                    className="rounded-xl border border-[#B9E8EE] bg-white px-4 py-2.5 text-sm font-semibold text-[#07879B] transition hover:bg-[#F0FAFB] disabled:opacity-50"
                  >
                    + Add checkpoint
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setIsAddingModule(
                        true
                      )
                    }
                    disabled={
                      isReordering
                    }
                    className="rounded-xl bg-[#172033] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#263247] disabled:opacity-50"
                  >
                    + Add module
                  </button>
                </div>
              </div>

              {reorderError && (
                <div className="mb-4 rounded-xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3">
                  <p className="text-sm text-[#b42318]">
                    {reorderError}
                  </p>
                </div>
              )}

              {isReordering && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#B9E8EE] bg-[#F0FAFB] px-4 py-3">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#08A9C1]/30 border-t-[#08A9C1]" />

                  <p className="text-xs font-medium text-[#08788A]">
                    Saving new day
                    order...
                  </p>
                </div>
              )}

              {orderedContent.length >
              0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={
                    closestCenter
                  }
                  onDragStart={
                    handleDragStart
                  }
                  onDragEnd={
                    handleDragEnd
                  }
                  onDragCancel={
                    handleDragCancel
                  }
                >
                  <SortableContext
                    items={sortableIds}
                    strategy={
                      verticalListSortingStrategy
                    }
                  >
                    <div className="space-y-4">
                      {orderedContent.map(
                        (
                          item,
                          contentIndex
                        ) => (
                          <SortableDayItem
                            key={
                              item
                                .dayContent
                                .id
                            }
                            item={item}
                            contentIndex={
                              contentIndex
                            }
                            moduleNumber={
                              item.type ===
                              "module"
                                ? moduleNumbers.get(
                                    item
                                      .module
                                      .id
                                  )
                                : undefined
                            }
                            isReordering={
                              isReordering
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
                  </SortableContext>

                  <DragOverlay>
                    <DragPreview
                      item={
                        activeDragItem
                      }
                    />
                  </DragOverlay>
                </DndContext>
              ) : (
                <div className="rounded-[18px] border border-dashed border-[#d0d5dd] bg-white px-6 py-12 text-center">
                  <p className="text-sm font-medium text-[#344054]">
                    This day does not
                    have any content yet.
                  </p>

                  <p className="mt-1 text-xs text-[#98a2b3]">
                    Add a module or
                    checkpoint to begin
                    building the training
                    day.
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 rounded-[18px] border border-dashed border-[#cfd8dc] bg-white/60 px-5 py-5">
                <button
                  type="button"
                  onClick={() =>
                    setIsAddingModule(
                      true
                    )
                  }
                  disabled={
                    isReordering
                  }
                  className="rounded-xl bg-[#172033] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#263247] disabled:opacity-50"
                >
                  + Add module
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setIsAddingCheckpoint(
                      true
                    )
                  }
                  disabled={
                    isReordering
                  }
                  className="rounded-xl border border-[#B9E8EE] bg-white px-4 py-2.5 text-sm font-semibold text-[#07879B] transition hover:bg-[#F0FAFB] disabled:opacity-50"
                >
                  + Add checkpoint
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-[18px] border border-dashed border-[#d0d5dd] bg-white px-6 py-12 text-center">
              <p className="text-sm font-medium text-[#344054]">
                Day {dayNumber} content
                is coming next.
              </p>
            </div>
          )}
        </div>
      </div>

      {isAddingModule &&
        activeDay && (
          <AddModuleEditor
            dayId={activeDay.id}
            nextPosition={
              activeDay.modules
                .length + 1
            }
            onClose={() =>
              setIsAddingModule(
                false
              )
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

      {isEditingDay &&
        activeDay && (
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