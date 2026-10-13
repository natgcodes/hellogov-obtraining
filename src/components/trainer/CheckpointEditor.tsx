"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import QuestionEditor, {
  QuizQuestion,
} from "@/components/trainer/QuestionEditor";
import type { Quiz } from "@/components/trainer/QuizEditor";

type CheckpointType =
  | "assessment"
  | "trainer_session"
  | "information";

type Checkpoint = {
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

type CheckpointEditorProps = {
  checkpoint: Checkpoint;
  onClose: () => void;
};

const questionTypeLabels: Record<string, string> = {
  single_choice: "Single Choice",
  multiple_choice: "Multiple Choice",
  true_false: "True / False",
  matching: "Matching",
  match_cards: "Match Cards",
  open_text: "Open Text",
  file_upload: "File Upload",
};

function getTypeContent(type: CheckpointType) {
  if (type === "trainer_session") {
    return {
      badge: "Live Session",
      subtitle: "Trainer Session",
      description:
        "Scheduled live session with a trainer.",
    };
  }

  if (type === "information") {
    return {
      badge: "Information",
      subtitle: "Instruction Block",
      description:
        "Information or instructions shown between modules.",
    };
  }

  return {
    badge: "Checkpoint",
    subtitle: "Assessment",
    description:
      "Scored assessment using the quiz engine.",
  };
}

function getLocalDateTimeParts(
  value: string | null
) {
  if (!value) {
    return {
      date: "",
      time: "",
    };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      date: "",
      time: "",
    };
  }

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");
  const hours = String(
    date.getHours()
  ).padStart(2, "0");
  const minutes = String(
    date.getMinutes()
  ).padStart(2, "0");

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}

export default function CheckpointEditor({
  checkpoint,
  onClose,
}: CheckpointEditorProps) {
  const router = useRouter();
  const supabase = createClient();

  const initialDateTime =
    getLocalDateTimeParts(
      checkpoint.scheduled_at
    );

  const [title, setTitle] = useState(
    checkpoint.title
  );

  const [description, setDescription] =
    useState(
      checkpoint.description ?? ""
    );

  const [passingScore, setPassingScore] =
    useState(
      checkpoint.passing_score?.toString() ??
        ""
    );

  const [isRequired, setIsRequired] =
    useState(checkpoint.is_required);

  const [meetingUrl, setMeetingUrl] =
    useState(
      checkpoint.meeting_url ?? ""
    );

  const [meetingDate, setMeetingDate] =
    useState(initialDateTime.date);

  const [meetingTime, setMeetingTime] =
    useState(initialDateTime.time);

  const [duration, setDuration] =
    useState(
      checkpoint.duration_minutes?.toString() ??
        ""
    );

  const [
    editingQuestion,
    setEditingQuestion,
  ] = useState<QuizQuestion | null>(null);

  const [
    isAddingQuestion,
    setIsAddingQuestion,
  ] = useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [isReordering, setIsReordering] =
    useState(false);

  const [
    showDeleteConfirmation,
    setShowDeleteConfirmation,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null);

  const quiz =
    checkpoint.quizzes?.[0] ?? null;

  const questions =
    quiz?.quiz_questions ?? [];

  const typeContent = getTypeContent(
    checkpoint.checkpoint_type
  );

  const isAssessment =
    checkpoint.checkpoint_type ===
    "assessment";

  const isTrainerSession =
    checkpoint.checkpoint_type ===
    "trainer_session";

  const isInformation =
    checkpoint.checkpoint_type ===
    "information";

  useEffect(() => {
    const dateTime =
      getLocalDateTimeParts(
        checkpoint.scheduled_at
      );

    setTitle(checkpoint.title);

    setDescription(
      checkpoint.description ?? ""
    );

    setPassingScore(
      checkpoint.passing_score?.toString() ??
        ""
    );

    setIsRequired(
      checkpoint.is_required
    );

    setMeetingUrl(
      checkpoint.meeting_url ?? ""
    );

    setMeetingDate(dateTime.date);
    setMeetingTime(dateTime.time);

    setDuration(
      checkpoint.duration_minutes?.toString() ??
        ""
    );

    setErrorMessage(null);
    setShowDeleteConfirmation(false);
  }, [checkpoint]);

  const isBusy =
    isSaving ||
    isDeleting ||
    isReordering;

  async function handleSave() {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setErrorMessage(
        "Title is required."
      );
      return;
    }

    setErrorMessage(null);

    let parsedPassingScore:
      | number
      | null = null;

    let parsedDuration:
      | number
      | null = null;

    let scheduledAt:
      | string
      | null = null;

    /*
     * ASSESSMENT VALIDATION
     */
    if (isAssessment) {
      if (
        passingScore.trim() !== ""
      ) {
        parsedPassingScore =
          Number(passingScore);

        if (
          !Number.isFinite(
            parsedPassingScore
          ) ||
          parsedPassingScore < 0 ||
          parsedPassingScore > 100
        ) {
          setErrorMessage(
            "Passing score must be a number between 0 and 100."
          );
          return;
        }
      }
    }

    /*
     * TRAINER SESSION VALIDATION
     */
    if (isTrainerSession) {
      if (
        (meetingDate &&
          !meetingTime) ||
        (!meetingDate &&
          meetingTime)
      ) {
        setErrorMessage(
          "Please provide both a date and time for the trainer session."
        );
        return;
      }

      if (
        meetingDate &&
        meetingTime
      ) {
        const localDate = new Date(
          `${meetingDate}T${meetingTime}`
        );

        if (
          Number.isNaN(
            localDate.getTime()
          )
        ) {
          setErrorMessage(
            "Please enter a valid meeting date and time."
          );
          return;
        }

        scheduledAt =
          localDate.toISOString();
      }

      if (
        duration.trim() !== ""
      ) {
        parsedDuration =
          Number(duration);

        if (
          !Number.isFinite(
            parsedDuration
          ) ||
          parsedDuration <= 0
        ) {
          setErrorMessage(
            "Duration must be greater than 0 minutes."
          );
          return;
        }
      }
    }

    setIsSaving(true);

    const checkpointUpdate = {
      title: cleanTitle,
      description:
        description.trim() || null,

      passing_score: isAssessment
        ? parsedPassingScore
        : null,

      is_required: isInformation
        ? false
        : isRequired,

      meeting_url: isTrainerSession
        ? meetingUrl.trim() || null
        : null,

      scheduled_at: isTrainerSession
        ? scheduledAt
        : null,

      duration_minutes:
        isTrainerSession
          ? parsedDuration
          : null,
    };

    const {
      error: checkpointError,
    } = await supabase
      .from("checkpoints")
      .update(checkpointUpdate)
      .eq("id", checkpoint.id);

    if (checkpointError) {
      console.error(
        "Error updating checkpoint:",
        checkpointError
      );

      setErrorMessage(
        "We couldn't save this checkpoint. Please try again."
      );

      setIsSaving(false);
      return;
    }

    /*
     * Keep the internal quiz synchronized
     * with an assessment checkpoint.
     */
    if (
      isAssessment &&
      checkpoint.quiz_id
    ) {
      const { error: quizError } =
        await supabase
          .from("quizzes")
.update({
  title: cleanTitle,
  description:
    description.trim() || null,
  passing_score:
    parsedPassingScore ?? 0,
  is_required: isRequired,
})
          .eq(
            "id",
            checkpoint.quiz_id
          );

      if (quizError) {
        console.error(
          "Error updating checkpoint assessment:",
          quizError
        );

        setErrorMessage(
          "The checkpoint was saved, but its assessment settings could not be synchronized."
        );

        setIsSaving(false);
        router.refresh();
        return;
      }
    }

    setIsSaving(false);
    router.refresh();
  }

  async function handleDelete() {
    setIsDeleting(true);
    setErrorMessage(null);

    const { error } =
      await supabase.rpc(
        "delete_day_checkpoint",
        {
          target_checkpoint_id:
            checkpoint.id,
        }
      );

    if (error) {
      console.error(
        "Error deleting checkpoint:",
        error
      );

      setErrorMessage(
        "We couldn't delete this checkpoint. Please try again."
      );

      setIsDeleting(false);
      return;
    }

    router.refresh();
    onClose();
  }

  async function moveQuestion(
    index: number,
    direction: "up" | "down"
  ) {
    if (isReordering) return;

    const targetIndex =
      direction === "up"
        ? index - 1
        : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= questions.length
    ) {
      return;
    }

    const current =
      questions[index];

    const target =
      questions[targetIndex];

    setIsReordering(true);
    setErrorMessage(null);

    const {
      error: firstTempError,
    } = await supabase
      .from("quiz_questions")
      .update({
        position: -700001,
      })
      .eq("id", current.id);

    if (firstTempError) {
      console.error(
        firstTempError
      );

      setErrorMessage(
        "We couldn't reorder the questions."
      );

      setIsReordering(false);
      return;
    }

    const {
      error: secondTempError,
    } = await supabase
      .from("quiz_questions")
      .update({
        position: -700002,
      })
      .eq("id", target.id);

    if (secondTempError) {
      await supabase
        .from("quiz_questions")
        .update({
          position:
            current.position,
        })
        .eq("id", current.id);

      setErrorMessage(
        "We couldn't reorder the questions."
      );

      setIsReordering(false);
      return;
    }

    const {
      error: currentError,
    } = await supabase
      .from("quiz_questions")
      .update({
        position:
          target.position,
      })
      .eq("id", current.id);

    const {
      error: targetError,
    } = await supabase
      .from("quiz_questions")
      .update({
        position:
          current.position,
      })
      .eq("id", target.id);

    if (
      currentError ||
      targetError
    ) {
      console.error(
        currentError ||
          targetError
      );

      setErrorMessage(
        "We couldn't reorder the questions."
      );
    }

    setIsReordering(false);
    router.refresh();
  }

  return (
    <>
      <div className="fixed inset-0 z-[80] flex justify-end bg-black/25 backdrop-blur-[1px]">
        <div className="h-full w-full max-w-[780px] overflow-y-auto border-l border-[#e5e7eb] bg-[#f7f8fa] shadow-2xl">
          {/* HEADER */}
          <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#eaecf0] bg-white/95 px-7 py-5 backdrop-blur">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#B9E8EE] bg-[#F0FAFB] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#08788A]">
                  {typeContent.badge}
                </span>

                <span className="rounded-full bg-[#f2f4f7] px-2.5 py-1 text-[10px] font-semibold text-[#667085]">
                  {typeContent.subtitle}
                </span>
              </div>

              <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[#172033]">
                {checkpoint.title}
              </h2>

              <p className="mt-1 text-xs text-[#98a2b3]">
                {typeContent.description}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e4e7ec] bg-white text-lg text-[#667085] transition hover:bg-[#f7f8fa] disabled:opacity-50"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="space-y-6 p-7">
            {/* SETTINGS */}
            <div className="space-y-5 rounded-[18px] border border-[#e5e7eb] bg-white p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#07879B]">
                  {isTrainerSession
                    ? "Session settings"
                    : isInformation
                      ? "Information settings"
                      : "Assessment settings"}
                </p>

                <p className="mt-1 text-xs leading-5 text-[#98a2b3]">
                  Type:{" "}
                  <span className="font-medium text-[#667085]">
                    {typeContent.subtitle}
                  </span>
                  . The content type is fixed
                  after creation.
                </p>
              </div>

              {/* TITLE */}
              <div>
                <label className="text-sm font-medium text-[#344054]">
                  {isTrainerSession
                    ? "Session title"
                    : isAssessment
                      ? "Assessment title"
                      : "Title"}
                </label>

                <input
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value
                    )
                  }
                  disabled={isBusy}
                  className="mt-2 w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm text-[#172033] outline-none transition focus:border-[#08A9C1] focus:ring-4 focus:ring-[#08A9C1]/10 disabled:bg-[#f9fafb]"
                />
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="text-sm font-medium text-[#344054]">
                  {isInformation
                    ? "Instructions"
                    : "Description"}
                </label>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  disabled={isBusy}
                  rows={
                    isInformation
                      ? 7
                      : 4
                  }
                  placeholder={
                    isInformation
                      ? "Write the information or instructions trainees should read..."
                      : isTrainerSession
                        ? "Explain what trainees should prepare or expect during this session."
                        : "Describe what this assessment evaluates."
                  }
                  className="mt-2 w-full resize-y rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm leading-6 text-[#172033] outline-none transition focus:border-[#08A9C1] focus:ring-4 focus:ring-[#08A9C1]/10 disabled:bg-[#f9fafb]"
                />
              </div>

              {/* ASSESSMENT */}
              {isAssessment && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-[#344054]">
                      Passing score
                    </label>

                    <div className="relative mt-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={
                          passingScore
                        }
                        onChange={(
                          event
                        ) =>
                          setPassingScore(
                            event.target
                              .value
                          )
                        }
                        disabled={isBusy}
                        placeholder="80"
                        className="w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 pr-10 text-sm text-[#172033] outline-none transition focus:border-[#08A9C1] focus:ring-4 focus:ring-[#08A9C1]/10 disabled:bg-[#f9fafb]"
                      />

                      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-[#98a2b3]">
                        %
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-[#344054]">
                      Requirement
                    </p>

                    <label className="mt-2 flex min-h-[42px] cursor-pointer items-center gap-3 rounded-xl border border-[#d0d5dd] px-3.5">
                      <input
                        type="checkbox"
                        checked={
                          isRequired
                        }
                        onChange={(
                          event
                        ) =>
                          setIsRequired(
                            event.target
                              .checked
                          )
                        }
                        disabled={isBusy}
                        className="h-4 w-4 rounded border-[#d0d5dd] accent-[#08A9C1]"
                      />

                      <span className="text-sm text-[#475467]">
                        Required
                        assessment
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* TRAINER SESSION */}
              {isTrainerSession && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-[#344054]">
                        Date
                      </label>

                      <input
                        type="date"
                        value={
                          meetingDate
                        }
                        onChange={(
                          event
                        ) =>
                          setMeetingDate(
                            event.target
                              .value
                          )
                        }
                        disabled={isBusy}
                        className="mt-2 w-full rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 text-sm text-[#172033] outline-none transition focus:border-[#08A9C1] focus:ring-4 focus:ring-[#08A9C1]/10 disabled:bg-[#f9fafb]"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#344054]">
                        Time
                      </label>

                      <input
                        type="time"
                        value={
                          meetingTime
                        }
                        onChange={(
                          event
                        ) =>
                          setMeetingTime(
                            event.target
                              .value
                          )
                        }
                        disabled={isBusy}
                        className="mt-2 w-full rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 text-sm text-[#172033] outline-none transition focus:border-[#08A9C1] focus:ring-4 focus:ring-[#08A9C1]/10 disabled:bg-[#f9fafb]"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-[#344054]">
                        Duration
                      </label>

                      <div className="relative mt-2">
                        <input
                          type="number"
                          min="1"
                          value={
                            duration
                          }
                          onChange={(
                            event
                          ) =>
                            setDuration(
                              event
                                .target
                                .value
                            )
                          }
                          disabled={isBusy}
                          placeholder="30"
                          className="w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 pr-14 text-sm text-[#172033] outline-none transition focus:border-[#08A9C1] focus:ring-4 focus:ring-[#08A9C1]/10 disabled:bg-[#f9fafb]"
                        />

                        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#98a2b3]">
                          min
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-[#344054]">
                        Requirement
                      </p>

                      <label className="mt-2 flex min-h-[42px] cursor-pointer items-center gap-3 rounded-xl border border-[#d0d5dd] px-3.5">
                        <input
                          type="checkbox"
                          checked={
                            isRequired
                          }
                          onChange={(
                            event
                          ) =>
                            setIsRequired(
                              event
                                .target
                                .checked
                            )
                          }
                          disabled={isBusy}
                          className="h-4 w-4 rounded border-[#d0d5dd] accent-[#08A9C1]"
                        />

                        <span className="text-sm text-[#475467]">
                          Required
                          session
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#344054]">
                      Meeting link
                    </label>

                    <input
                      type="url"
                      value={meetingUrl}
                      onChange={(
                        event
                      ) =>
                        setMeetingUrl(
                          event.target
                            .value
                        )
                      }
                      disabled={isBusy}
                      placeholder="https://meet.google.com/..."
                      className="mt-2 w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#98a2b3] focus:border-[#08A9C1] focus:ring-4 focus:ring-[#08A9C1]/10 disabled:bg-[#f9fafb]"
                    />

                    <p className="mt-1.5 text-xs leading-5 text-[#98a2b3]">
                      This can be added
                      later if the meeting
                      has not been scheduled
                      yet.
                    </p>
                  </div>
                </>
              )}

              {/* INFORMATION */}
              {isInformation && (
                <div className="rounded-xl border border-[#B9E8EE] bg-[#F0FAFB] px-4 py-3">
                  <p className="text-xs leading-5 text-[#08788A]">
                    Information blocks
                    are informational only.
                    They do not require a
                    score or trainee
                    completion.
                  </p>
                </div>
              )}

              {errorMessage && (
                <div className="rounded-xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3">
                  <p className="text-sm text-[#b42318]">
                    {errorMessage}
                  </p>
                </div>
              )}

              <div className="flex justify-end border-t border-[#eef0f3] pt-4">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isBusy}
                  className="rounded-xl bg-[#172033] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#263247] disabled:opacity-50"
                >
                  {isSaving
                    ? "Saving..."
                    : "Save settings"}
                </button>
              </div>
            </div>

            {/* QUESTIONS - ASSESSMENT ONLY */}
            {isAssessment && (
              <div>
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#07879B]">
                      Questions
                    </p>

                    <p className="mt-1 text-sm text-[#667085]">
                      {questions.length}{" "}
                      {questions.length ===
                      1
                        ? "question"
                        : "questions"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setIsAddingQuestion(
                        true
                      )
                    }
                    disabled={
                      !checkpoint.quiz_id ||
                      isBusy
                    }
                    className="rounded-xl bg-[#08A9C1] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#07879B] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    + Add question
                  </button>
                </div>

                {!checkpoint.quiz_id && (
                  <div className="mb-3 rounded-xl border border-[#fedf89] bg-[#fffaeb] px-4 py-3">
                    <p className="text-xs leading-5 text-[#b54708]">
                      This assessment does
                      not have an internal
                      quiz attached. Create
                      a new assessment to
                      use the question
                      builder.
                    </p>
                  </div>
                )}

                {questions.length > 0 ? (
                  <div className="space-y-3">
                    {questions.map(
                      (
                        question,
                        index
                      ) => (
                        <div
                          key={
                            question.id
                          }
                          className="rounded-[16px] border border-[#e5e7eb] bg-white p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F0FAFB] text-xs font-semibold text-[#08788A]">
                              {index + 1}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-[#f2f4f7] px-2 py-1 text-[10px] font-semibold text-[#667085]">
                                  {questionTypeLabels[
                                    question
                                      .question_type
                                  ] ??
                                    question.question_type}
                                </span>

                                <span className="text-[11px] text-[#98a2b3]">
                                  {
                                    question.points
                                  }{" "}
                                  {Number(
                                    question.points
                                  ) === 1
                                    ? "point"
                                    : "points"}
                                </span>
                              </div>

                              <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-5 text-[#344054]">
                                {
                                  question.question_text
                                }
                              </p>

                              {question.instructions && (
                                <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#98a2b3]">
                                  {
                                    question.instructions
                                  }
                                </p>
                              )}
                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  moveQuestion(
                                    index,
                                    "up"
                                  )
                                }
                                disabled={
                                  index ===
                                    0 ||
                                  isBusy
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e4e7ec] bg-white text-xs text-[#475467] transition hover:bg-[#F0FAFB] disabled:opacity-30"
                              >
                                ↑
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  moveQuestion(
                                    index,
                                    "down"
                                  )
                                }
                                disabled={
                                  index ===
                                    questions.length -
                                      1 ||
                                  isBusy
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e4e7ec] bg-white text-xs text-[#475467] transition hover:bg-[#F0FAFB] disabled:opacity-30"
                              >
                                ↓
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setEditingQuestion(
                                    question
                                  )
                                }
                                disabled={
                                  isBusy
                                }
                                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#475467] transition hover:bg-[#f2f4f7] disabled:opacity-50"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="rounded-[18px] border border-dashed border-[#d0d5dd] bg-white px-5 py-8 text-center">
                    <p className="text-sm text-[#98a2b3]">
                      No questions have
                      been added yet.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* DELETE */}
            <div className="rounded-[18px] border border-[#fecdca] bg-white p-5">
              <p className="text-sm font-semibold text-[#b42318]">
                Delete{" "}
                {isTrainerSession
                  ? "trainer session"
                  : isInformation
                    ? "information block"
                    : "checkpoint"}
              </p>

              <p className="mt-1 text-xs leading-5 text-[#98a2b3]">
                {isAssessment
                  ? "Permanently remove this checkpoint, its assessment, and all of its questions."
                  : "Permanently remove this item from the training day."}
              </p>

              {!showDeleteConfirmation ? (
                <button
                  type="button"
                  onClick={() =>
                    setShowDeleteConfirmation(
                      true
                    )
                  }
                  disabled={isBusy}
                  className="mt-3 rounded-xl border border-[#fecdca] bg-white px-3.5 py-2 text-xs font-semibold text-[#b42318] transition hover:bg-[#fef3f2] disabled:opacity-50"
                >
                  Delete
                </button>
              ) : (
                <div className="mt-3 rounded-xl bg-[#fef3f2] p-4">
                  <p className="text-sm font-semibold text-[#912018]">
                    Delete “
                    {checkpoint.title}”?
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#b42318]">
                    This action cannot be
                    undone.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setShowDeleteConfirmation(
                          false
                        )
                      }
                      disabled={isBusy}
                      className="rounded-lg border border-[#d0d5dd] bg-white px-3 py-2 text-xs font-semibold text-[#344054]"
                    >
                      Keep item
                    </button>

                    <button
                      type="button"
                      onClick={
                        handleDelete
                      }
                      disabled={isBusy}
                      className="rounded-lg bg-[#b42318] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {isDeleting
                        ? "Deleting..."
                        : "Yes, delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isAssessment &&
        isAddingQuestion &&
        checkpoint.quiz_id && (
          <QuestionEditor
            quizId={
              checkpoint.quiz_id
            }
            nextPosition={
              questions.length + 1
            }
            onClose={() =>
              setIsAddingQuestion(
                false
              )
            }
          />
        )}

      {isAssessment &&
        editingQuestion &&
        checkpoint.quiz_id && (
          <QuestionEditor
            question={
              editingQuestion
            }
            quizId={
              checkpoint.quiz_id
            }
            onClose={() =>
              setEditingQuestion(
                null
              )
            }
          />
        )}
    </>
  );
}