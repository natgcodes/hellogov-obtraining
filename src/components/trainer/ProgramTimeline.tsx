"use client";

import { useState } from "react";
import DayEditor from "@/components/trainer/DayEditor";
import SetupEditor from "@/components/trainer/SetupEditor";
import CertificationEditor from "@/components/trainer/CertificationEditor";
import PostTrainingEditor from "@/components/trainer/PostTrainingEditor";
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
  quizzes: Quiz[];
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

type SetupItem = {
  id: string;
  program_id: string;
  title: string;
  description: string | null;
  position: number;
  is_required: boolean;
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
  certification: Certification | null;
  postTraining: PostTraining | null;
};

type TimelineItem = {
  id: string;
  label: string;
  title: string;
  description: string;
  day?: SupabaseDay;
  count?: number;
  countLabel?: string;
  duration?: string;
  status?: "draft" | "published";
  color:
    | "red"
    | "blue"
    | "green"
    | "purple"
    | "neutral";
  editable?: boolean;
};

type ActiveSection =
  | "setup"
  | "certification"
  | "post-training"
  | null;

const PROGRAM_ID =
  "5f5a6ef1-3133-45f6-b421-0dc09ea4a6a0";

const colors = {
  red: {
    dot: "bg-[#e84545]",
    soft: "bg-[#fff1f1]",
    text: "text-[#d83d3d]",
  },
  blue: {
    dot: "bg-[#4f7cff]",
    soft: "bg-[#eef3ff]",
    text: "text-[#4169d8]",
  },
  green: {
    dot: "bg-[#22a06b]",
    soft: "bg-[#ecfdf3]",
    text: "text-[#16845a]",
  },
  purple: {
    dot: "bg-[#7c5cff]",
    soft: "bg-[#f3f0ff]",
    text: "text-[#6847df]",
  },
  neutral: {
    dot: "bg-[#98a2b3]",
    soft: "bg-[#f2f4f7]",
    text: "text-[#667085]",
  },
};

function getDayColor(
  dayNumber: number
): TimelineItem["color"] {
  if (dayNumber === 1 || dayNumber === 2) {
    return "blue";
  }

  if (dayNumber === 3) {
    return "green";
  }

  if (dayNumber === 4) {
    return "red";
  }

  return "neutral";
}

function getDayDuration(day: SupabaseDay) {
  const totalMinutes = day.modules.reduce(
    (total, module) =>
      total + (module.duration_minutes ?? 0),
    0
  );

  if (totalMinutes === 0) {
    return "Time not set";
  }

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
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
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function ProgramTimeline({
  days,
  setupItems,
  certification,
  postTraining,
}: ProgramTimelineProps) {
  const [selectedDayId, setSelectedDayId] = useState<
    string | null
  >(null);

  const [activeSection, setActiveSection] =
    useState<ActiveSection>(null);

  const selectedDay =
    days.find((day) => day.id === selectedDayId) ?? null;

  const dayItems: TimelineItem[] = days.map((day) => ({
    id: day.id,
    label: `Day ${day.day_number}`,
    title: day.title,
    description: day.description ?? "",
    day,
    count: day.modules.length,
    countLabel: formatCount(
      day.modules.length,
      "module",
      "modules"
    ),
    duration: getDayDuration(day),
    status: day.is_published ? "published" : "draft",
    color: getDayColor(day.day_number),
    editable: true,
  }));

  const items: TimelineItem[] = [
    {
      id: "setup",
      label: "Before Day 1",
      title: "Tool Setup",
      description:
        "Confirm that every learner has the required accounts, permissions and tools before onboarding begins.",
      count: setupItems.length,
      countLabel: formatCount(
        setupItems.length,
        "setup item",
        "setup items"
      ),
      color: "neutral",
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
      count:
        certification?.certification_components?.length ?? 0,
      countLabel: formatCount(
        certification?.certification_components?.length ?? 0,
        "component",
        "components"
      ),
      color: "purple",
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
      count:
        postTraining?.post_training_stages?.length ?? 0,
      countLabel: formatCount(
        postTraining?.post_training_stages?.length ?? 0,
        "stage",
        "stages"
      ),
      color: "neutral",
      editable: true,
    },
  ];

  function handleItemClick(item: TimelineItem) {
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
      setActiveSection("certification");
      return;
    }

    if (item.id === "post-training") {
      setActiveSection("post-training");
    }
  }

  return (
    <>
      <div className="relative">
        <div className="absolute bottom-10 left-[19px] top-10 w-px bg-[#e4e7ec]" />

        <div className="space-y-4">
          {items.map((item) => {
            const palette = colors[item.color];

            return (
              <div
                key={item.id}
                className="relative flex gap-5"
              >
                <div className="relative z-10 flex w-10 shrink-0 justify-center pt-7">
                  <div
                    className={`h-[11px] w-[11px] rounded-full ${palette.dot} ring-4 ring-[#f7f8fa]`}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleItemClick(item)}
                  disabled={!item.editable}
                  className={`group w-full rounded-[20px] border border-[#e5e7eb] bg-white p-6 text-left shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition ${
                    item.editable
                      ? "cursor-pointer hover:-translate-y-[1px] hover:border-[#d7dbe2] hover:shadow-[0_8px_24px_rgba(16,24,40,0.06)]"
                      : "cursor-default opacity-70"
                  }`}
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${palette.soft} ${palette.text}`}
                        >
                          {item.label}
                        </span>

                        {item.status && (
                          <span className="rounded-full border border-[#e4e7ec] bg-white px-2.5 py-1 text-[11px] font-medium capitalize text-[#667085]">
                            {item.status}
                          </span>
                        )}
                      </div>

                      <h3 className="text-[17px] font-semibold tracking-[-0.015em] text-[#172033]">
                        {item.title}
                      </h3>

                      <p className="mt-1.5 max-w-3xl text-sm leading-6 text-[#667085]">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-5">
                      {(item.countLabel ||
                        item.duration) && (
                        <div className="hidden text-right md:block">
                          {item.countLabel && (
                            <div className="text-sm font-medium text-[#344054]">
                              {item.countLabel}
                            </div>
                          )}

                          {item.duration && (
                            <div className="mt-0.5 text-xs text-[#98a2b3]">
                              {item.duration}
                            </div>
                          )}
                        </div>
                      )}

                      {item.editable && (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e4e7ec] text-[#667085] transition group-hover:border-[#d0d5dd] group-hover:bg-[#f9fafb] group-hover:text-[#172033]">
                          →
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <DayEditor
          day={selectedDay}
          dayNumber={selectedDay.day_number}
          title={selectedDay.title}
          description={selectedDay.description ?? ""}
          onClose={() => setSelectedDayId(null)}
        />
      )}

      {activeSection === "setup" && (
        <SetupEditor
          items={setupItems}
          programId={PROGRAM_ID}
          onClose={() => setActiveSection(null)}
        />
      )}

      {activeSection === "certification" &&
        certification && (
          <CertificationEditor
            certification={certification}
            onClose={() => setActiveSection(null)}
          />
        )}

      {activeSection === "post-training" &&
        postTraining && (
          <PostTrainingEditor
            postTraining={postTraining}
            onClose={() => setActiveSection(null)}
          />
        )}
    </>
  );
}