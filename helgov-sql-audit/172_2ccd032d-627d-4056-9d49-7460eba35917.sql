│
◇  Downloading snippet...
"use client";

import { useState } from "react";

import CertificationEditor from "@/components/trainer/CertificationEditor";
import DayEditor from "@/components/trainer/DayEditor";
import PostTrainingEditor from "@/components/trainer/PostTrainingEditor";
import SetupEditor from "@/components/trainer/SetupEditor";
import type { Quiz } from "@/components/trainer/QuizEditor";

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
  allow_learner_completion: boolean;
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

type SetupItem = {
  id: string;
  program_id: string;
  title: string;
  description: string | null;
  position: number;
  is_required: boolean;
};

type SetupSection = {
  id: string;
  program_id: string;
  title: string;
  description: string | null;
  instructions: string | null;
};

type CertificationComponent = {
  id: string;
  title: string;
  description: string | null;
  component_type: string;
  passing_score: number | null;
  position: number;
};

type Certification = {
  id: string;
  program_id: string;
  title: string;
  description: string | null;
  passing_score: number | null;
  certification_components: CertificationComponent[];
};

type PostTrainingStage = {
  id: string;
  title: string;
  description: string | null;
  position: number;
};

type PostTraining = {
  id: string;
  program_id: string;
  title: string;
  description: string | null;
  disclaimer: string | null;
  post_training_stages: PostTrainingStage[];
};

type ProgramTimelineProps = {
  days: SupabaseDay[];
  setupItems: SetupItem[];
  setupSection: SetupSection;
  certification: Certification | null;
  postTraining: PostTraining | null;
};

type TimelineItem = {
  id: string;
  label: string;
  title: string;
  description: string;
  kind:
    | "setup"
    | "day"
    | "certification"
    | "post-training";
  day?: SupabaseDay;
  countLabel?: string;
  duration?: string;
  status?: "draft" | "published";
  editable?: boolean;
};

type ActiveSection =
  | "setup"
  | "certification"
  | "post-training"
  | null;

function getDayDuration(day: SupabaseDay) {
  const totalMinutes = day.modules.reduce(
    (total, module) =>
      total +
      (module.duration_minutes ?? 0),
    0
  );

  if (totalMinutes === 0) {
    return "Time not set";
  }

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(
    totalMinutes / 60
  );
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${minutes} min`;
}

function formatCount(
  count: number,
  singular: string,
  plural: string
) {
  return `${count} ${
    count === 1 ? singular : plural
  }`;
}

function TimelineIcon({
  kind,
}: {
  kind: TimelineItem["kind"];
}) {
  const common = "h-[17px] w-[17px]";

  if (kind === "setup") {
    return (
      <svg
        className={common}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3v3" />
        <path d="M12 18v3" />
        <path d="m4.2 4.2 2.1 2.1" />
        <path d="m17.7 17.7 2.1 2.1" />
        <path d="M3 12h3" />
        <path d="M18 12h3" />
        <path d="m4.2 19.8 2.1-2.1" />
        <path d="m17.7 6.3 2.1-2.1" />
        <circle cx="12" cy="12" r="3.5" />
      </svg>
    );
  }

  if (kind === "certification") {
    return (
      <svg
        className={common}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="9" r="5" />
        <path d="m9 13-1 8 4-2 4 2-1-8" />
      </svg>
    );
  }

  if (kind === "post-training") {
    return (
      <svg
        className={common}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 12h14" />
        <path d="m14 7 5 5-5 5" />
      </svg>
    );
  }

  return (
    <svg
      className={common}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="5"
        y="4"
        width="14"
        height="16"
        rx="2"
      />
      <path d="M8.5 8h7" />
      <path d="M8.5 12h7" />
      <path d="M8.5 16h4.5" />
    </svg>
  );
}

export default function ProgramTimeline({
  days,
  setupItems,
  setupSection,
  certification,
  postTraining,
}: ProgramTimelineProps) {
  const [selectedDayId, setSelectedDayId] =
    useState<string | null>(null);

  const [activeSection, setActiveSection] =
    useState<ActiveSection>(null);

  const selectedDay =
    days.find(
      (day) => day.id === selectedDayId
    ) ?? null;

  const dayItems: TimelineItem[] =
    days.map((day) => ({
      id: day.id,
      label: `Day ${day.day_number}`,
      title: day.title,
      description:
        day.description ?? "",
      kind: "day",
      day,
      countLabel: formatCount(
        day.modules.length,
        "module",
        "modules"
      ),
      duration: getDayDuration(day),
      status: day.is_published
        ? "published"
        : "draft",
      editable: true,
    }));

  const items: TimelineItem[] = [
    {
      id: "setup",
      label: "Before Day 1",
      title: setupSection.title,
      description:
        setupSection.description ?? "",
      kind: "setup",
      countLabel: formatCount(
        setupItems.length,
        "setup item",
        "setup items"
      ),
      editable: true,
    },

    ...dayItems,

    {
      id: "certification",
      label: "Final Assessment",
      title:
        certification?.title ??
        "HelloGov Customer Support Certification",
      description:
        certification?.description ??
        "Final knowledge, platform and mock-call assessments before supported production.",
      kind: "certification",
      countLabel: formatCount(
        certification
          ?.certification_components
          ?.length ?? 0,
        "component",
        "components"
      ),
      editable: true,
    },

    {
      id: "post-training",
      label: "After Onboarding",
      title:
        postTraining?.title ??
        "Nesting & Supported Production",
      description:
        postTraining?.description ??
        "Shadowing, supported calls, QA follow-up and coaching after onboarding.",
      kind: "post-training",
      countLabel: formatCount(
        postTraining
          ?.post_training_stages
          ?.length ?? 0,
        "stage",
        "stages"
      ),
      editable: true,
    },
  ];

  function handleItemClick(
    item: TimelineItem
  ) {
    if (item.day) {
      setActiveSection(null);
      setSelectedDayId(item.day.id);
      return;
    }

    setSelectedDayId(null);

    if (item.id === "setup") {
      setActiveSection("setup");
      return;
    }

    if (item.id === "certification") {
      setActiveSection(
        "certification"
      );
      return;
    }

    if (item.id === "post-training") {
      setActiveSection(
        "post-training"
      );
    }
  }

  return (
    <>
      <section className="overflow-hidden rounded-[18px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
        <div className="border-b border-[var(--border-soft)] px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                Onboarding structure
              </h2>

              <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">
                Select a section to manage its
                content, resources and assessments.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#EAF8FA] px-2.5 py-1 text-[10px] font-semibold text-[#07879B]">
                {days.length}{" "}
                {days.length === 1
                  ? "training day"
                  : "training days"}
              </span>

              <span className="rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)]">
                {items.length} sections
              </span>
            </div>
          </div>
        </div>

        <div className="divide-y divide-[var(--border-soft)]">
          {items.map(
            (item, index) => {
              const isFirst =
                index === 0;
              const isLast =
                index ===
                items.length - 1;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    handleItemClick(
                      item
                    )
                  }
                  disabled={
                    !item.editable
                  }
                  className={`group relative flex w-full gap-4 bg-white px-5 py-5 text-left transition-colors sm:gap-5 sm:px-6 ${
                    item.editable
                      ? "cursor-pointer hover:bg-[#FAFCFC]"
                      : "cursor-default opacity-70"
                  }`}
                >
                  <div className="relative flex w-9 shrink-0 justify-center">
                    {!isFirst && (
                      <div className="absolute -top-5 bottom-1/2 left-1/2 w-px -translate-x-1/2 bg-[var(--border)]" />
                    )}

                    {!isLast && (
                      <div className="absolute left-1/2 top-1/2 -bottom-5 w-px -translate-x-1/2 bg-[var(--border)]" />
                    )}

                    <div
                      className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border transition ${
                        item.kind ===
                        "certification"
                          ? "border-[#08A9C1]/25 bg-[#EAF8FA] text-[#07879B]"
                          : item.kind ===
                              "day"
                            ? "border-[#08A9C1]/20 bg-[#F3FBFC] text-[#07879B]"
                            : "border-[var(--border)] bg-white text-[var(--text-muted)]"
                      }`}
                    >
                      <TimelineIcon
                        kind={
                          item.kind
                        }
                      />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                              item.kind ===
                              "certification"
                                ? "bg-[#EAF8FA] text-[#07879B]"
                                : item.kind ===
                                    "day"
                                  ? "bg-[#F2F4F7] text-[var(--text-secondary)]"
                                  : "bg-[#F8FAFB] text-[var(--text-muted)]"
                            }`}
                          >
                            {
                              item.label
                            }
                          </span>

                          {item.status && (
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${
                                item.status ===
                                "published"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  item.status ===
                                  "published"
                                    ? "bg-emerald-500"
                                    : "bg-slate-400"
                                }`}
                              />

                              {
                                item.status
                              }
                            </span>
                          )}
                        </div>

                        <h3 className="mt-2.5 text-[15px] font-semibold tracking-[-0.015em] text-[var(--text-primary)] sm:text-[16px]">
                          {item.title}
                        </h3>

                        {item.description && (
                          <p className="mt-1.5 max-w-3xl whitespace-pre-wrap text-[12px] leading-5 text-[var(--text-secondary)] sm:text-[13px]">
                            {
                              item.description
                            }
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-4 md:pl-4">
                        {(item.countLabel ||
                          item.duration) && (
                          <div className="min-w-[100px] text-left md:text-right">
                            {item.countLabel && (
                              <p className="text-[12px] font-semibold text-[var(--text-secondary)]">
                                {
                                  item.countLabel
                                }
                              </p>
                            )}

                            {item.duration && (
                              <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                                {
                                  item.duration
                                }
                              </p>
                            )}
                          </div>
                        )}

                        {item.editable && (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-[var(--border)] bg-white text-[var(--text-muted)] transition group-hover:border-[#08A9C1]/30 group-hover:bg-[#EAF8FA] group-hover:text-[#07879B]">
                            <svg
                              className="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M5 12h14" />
                              <path d="m14 7 5 5-5 5" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            }
          )}
        </div>
      </section>

      {selectedDay && (
        <DayEditor
          day={selectedDay}
          dayNumber={
            selectedDay.day_number
          }
          title={selectedDay.title}
          description={
            selectedDay.description ??
            ""
          }
          onClose={() =>
            setSelectedDayId(null)
          }
        />
      )}

      {activeSection === "setup" && (
        <SetupEditor
          items={setupItems}
          programId={
            setupSection.program_id
          }
          section={setupSection}
          onClose={() =>
            setActiveSection(null)
          }
        />
      )}

      {activeSection ===
        "certification" &&
        certification && (
          <CertificationEditor
            certification={
              certification
            }
            onClose={() =>
              setActiveSection(null)
            }
          />
        )}

      {activeSection ===
        "post-training" &&
        postTraining && (
          <PostTrainingEditor
            postTraining={
              postTraining
            }
            onClose={() =>
              setActiveSection(null)
            }
          />
        )}
    </>
  );
}
