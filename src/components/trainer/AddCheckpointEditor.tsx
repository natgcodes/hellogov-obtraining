"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { officialDateTimeToUTC } from "@/lib/datetime";
import DualDateTime from "@/components/ui/DualDateTime";

type CheckpointType =
  | "assessment"
  | "trainer_session"
  | "information";

type AddCheckpointEditorProps = {
  dayId: string;
  nextPosition: number;
  onClose: () => void;
};

export default function AddCheckpointEditor({
  dayId,
  nextPosition,
  onClose,
}: AddCheckpointEditorProps) {
  const router = useRouter();
  const supabase = createClient();

  const [checkpointType, setCheckpointType] =
    useState<CheckpointType>("assessment");

  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");

  const [passingScore, setPassingScore] =
    useState("80");

  const [meetingDate, setMeetingDate] =
    useState("");
  const [meetingTime, setMeetingTime] =
    useState("");
  const [duration, setDuration] =
    useState("30");
  const [meetingUrl, setMeetingUrl] =
    useState("");

  const [isRequired, setIsRequired] =
    useState(true);

  const [
    allowLearnerCompletion,
    setAllowLearnerCompletion,
  ] = useState(false);

  const [isSaving, setIsSaving] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const scheduledPreview =
    meetingDate && meetingTime
      ? officialDateTimeToUTC(
          meetingDate,
          meetingTime
        )
      : null;

  function changeType(type: CheckpointType) {
    setCheckpointType(type);
    setErrorMessage(null);

    if (type === "assessment") {
      setIsRequired(true);
      setAllowLearnerCompletion(false);
    }

    if (type === "trainer_session") {
      setIsRequired(true);
      setAllowLearnerCompletion(true);
    }

    if (type === "information") {
      setIsRequired(false);
      setAllowLearnerCompletion(true);
    }
  }

  async function saveCompletionSetting(
    checkpointId: string
  ) {
    const { error } = await supabase
      .from("checkpoints")
      .update({
        allow_learner_completion:
          allowLearnerCompletion,
      })
      .eq("id", checkpointId);

    return error;
  }

  async function handleSave() {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setErrorMessage(
        "Checkpoint title is required."
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    /*
     * ASSESSMENT
     */
    if (checkpointType === "assessment") {
      const parsedPassingScore =
        passingScore.trim() === ""
          ? null
          : Number(passingScore);

      if (
        parsedPassingScore !== null &&
        (!Number.isFinite(parsedPassingScore) ||
          parsedPassingScore < 0 ||
          parsedPassingScore > 100)
      ) {
        setErrorMessage(
          "Passing score must be a number between 0 and 100."
        );
        setIsSaving(false);
        return;
      }

      const { data, error } =
        await supabase.rpc(
          "create_checkpoint_assessment",
          {
            target_day_id: dayId,
            checkpoint_title: cleanTitle,
            checkpoint_description:
              description.trim() || null,
            target_checkpoint_type:
              "assessment",
            target_passing_score:
              parsedPassingScore,
            target_position: nextPosition,
          }
        );

      if (error) {
        console.error(
          "Error creating assessment checkpoint:",
          error
        );

        setErrorMessage(
          "We couldn't create this assessment. Please try again."
        );
        setIsSaving(false);
        return;
      }

      const checkpointId =
        data as string | null;

      if (!checkpointId) {
        setErrorMessage(
          "The assessment was created, but its completion settings could not be saved."
        );
        setIsSaving(false);
        router.refresh();
        return;
      }

      const {
        error: checkpointSettingsError,
      } = await supabase
        .from("checkpoints")
        .update({
          is_required: isRequired,
          allow_learner_completion:
            allowLearnerCompletion,
        })
        .eq("id", checkpointId);

      if (checkpointSettingsError) {
        console.error(
          "Error saving assessment checkpoint settings:",
          checkpointSettingsError
        );

        setErrorMessage(
          "The assessment was created, but its checkpoint settings could not be saved."
        );
        setIsSaving(false);
        router.refresh();
        return;
      }

      const {
        data: createdCheckpoint,
        error: checkpointLookupError,
      } = await supabase
        .from("checkpoints")
        .select("quiz_id")
        .eq("id", checkpointId)
        .single();

      if (
        checkpointLookupError ||
        !createdCheckpoint
      ) {
        console.error(
          "Unable to load created assessment:",
          checkpointLookupError
        );

        setErrorMessage(
          "The assessment was created, but its quiz settings could not be synchronized."
        );
        setIsSaving(false);
        router.refresh();
        return;
      }

      if (createdCheckpoint.quiz_id) {
        const { error: quizError } =
          await supabase
            .from("quizzes")
            .update({
              is_required: isRequired,
            })
            .eq(
              "id",
              createdCheckpoint.quiz_id
            );

        if (quizError) {
          console.error(
            "Error synchronizing assessment requirement:",
            quizError
          );

          setErrorMessage(
            "The assessment was created, but its quiz requirement could not be synchronized."
          );
          setIsSaving(false);
          router.refresh();
          return;
        }
      }

      router.refresh();
      onClose();
      return;
    }

    /*
     * TRAINER SESSION
     */
    if (
      checkpointType === "trainer_session"
    ) {
      let scheduledAt: string | null =
        null;

      if (
        (meetingDate && !meetingTime) ||
        (!meetingDate && meetingTime)
      ) {
        setErrorMessage(
          "Please provide both a date and time for the trainer session."
        );
        setIsSaving(false);
        return;
      }

      if (meetingDate && meetingTime) {
        scheduledAt = officialDateTimeToUTC(
          meetingDate,
          meetingTime
        );

        if (!scheduledAt) {
          setErrorMessage(
            "Please enter a valid meeting date and time."
          );
          setIsSaving(false);
          return;
        }
      }

      const parsedDuration =
        duration.trim() === ""
          ? null
          : Number(duration);

      if (
        parsedDuration !== null &&
        (!Number.isFinite(parsedDuration) ||
          parsedDuration <= 0)
      ) {
        setErrorMessage(
          "Duration must be greater than 0 minutes."
        );
        setIsSaving(false);
        return;
      }

      const { data, error } =
        await supabase.rpc(
          "create_day_checkpoint",
          {
            target_day_id: dayId,
            checkpoint_title: cleanTitle,
            checkpoint_description:
              description.trim() || null,
            target_checkpoint_type:
              "trainer_session",
            target_meeting_url:
              meetingUrl.trim() || null,
            target_scheduled_at:
              scheduledAt,
            target_duration_minutes:
              parsedDuration,
            target_is_required:
              isRequired,
          }
        );

      if (error) {
        console.error(
          "Error creating trainer session:",
          error
        );

        setErrorMessage(
          "We couldn't create this trainer session. Please try again."
        );
        setIsSaving(false);
        return;
      }

      const checkpointId =
        data as string | null;

      if (!checkpointId) {
        setErrorMessage(
          "The trainer session was created, but its completion settings could not be saved."
        );
        setIsSaving(false);
        router.refresh();
        return;
      }

      const completionError =
        await saveCompletionSetting(
          checkpointId
        );

      if (completionError) {
        console.error(
          "Error saving trainer session completion settings:",
          completionError
        );

        setErrorMessage(
          "The trainer session was created, but its trainee completion setting could not be saved."
        );
        setIsSaving(false);
        router.refresh();
        return;
      }

      router.refresh();
      onClose();
      return;
    }

    /*
     * INFORMATION
     */
    const { data, error } =
      await supabase.rpc(
        "create_day_checkpoint",
        {
          target_day_id: dayId,
          checkpoint_title: cleanTitle,
          checkpoint_description:
            description.trim() || null,
          target_checkpoint_type:
            "information",
          target_meeting_url: null,
          target_scheduled_at: null,
          target_duration_minutes: null,
          target_is_required:
            isRequired,
        }
      );

    if (error) {
      console.error(
        "Error creating information block:",
        error
      );

      setErrorMessage(
        "We couldn't create this information block. Please try again."
      );
      setIsSaving(false);
      return;
    }

    const checkpointId =
      data as string | null;

    if (!checkpointId) {
      setErrorMessage(
        "The information block was created, but its completion settings could not be saved."
      );
      setIsSaving(false);
      router.refresh();
      return;
    }

    const completionError =
      await saveCompletionSetting(
        checkpointId
      );

    if (completionError) {
      console.error(
        "Error saving information completion settings:",
        completionError
      );

      setErrorMessage(
        "The information block was created, but its trainee completion setting could not be saved."
      );
      setIsSaving(false);
      router.refresh();
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[1px]">
      <div className="max-h-[92vh] w-full max-w-[680px] overflow-y-auto rounded-[24px] border border-[#e5e7eb] bg-white shadow-2xl">
        {/* HEADER */}

        <div className="flex items-start justify-between border-b border-[#eef0f3] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#07879B]">
              Day content
            </p>

            <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[#172033]">
              Add checkpoint
            </h2>

            <p className="mt-1 text-sm text-[#667085]">
              Add an assessment, live session, or
              instruction between training modules.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e4e7ec] text-lg text-[#667085] transition hover:bg-[#f7f8fa] disabled:opacity-50"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* TYPE */}

          <div>
            <label className="mb-2 block text-sm font-medium text-[#344054]">
              Checkpoint type
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <TypeCard
                selected={
                  checkpointType ===
                  "assessment"
                }
                title="Assessment"
                description="Scored quiz with questions."
                icon="✓"
                onClick={() =>
                  changeType("assessment")
                }
                disabled={isSaving}
              />

              <TypeCard
                selected={
                  checkpointType ===
                  "trainer_session"
                }
                title="Trainer Session"
                description="Scheduled live meeting."
                icon="◷"
                onClick={() =>
                  changeType(
                    "trainer_session"
                  )
                }
                disabled={isSaving}
              />

              <TypeCard
                selected={
                  checkpointType ===
                  "information"
                }
                title="Information"
                description="Instructions or context."
                icon="i"
                onClick={() =>
                  changeType("information")
                }
                disabled={isSaving}
              />
            </div>
          </div>

          {/* TITLE */}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#344054]">
              {checkpointType ===
              "information"
                ? "Title"
                : checkpointType ===
                    "trainer_session"
                  ? "Session title"
                  : "Assessment title"}
            </label>

            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value
                )
              }
              disabled={isSaving}
              placeholder={
                checkpointType ===
                "assessment"
                  ? "e.g. Mid-Day Knowledge Check"
                  : checkpointType ===
                      "trainer_session"
                    ? "e.g. Live Practice with Trainer"
                    : "e.g. Before you continue"
              }
              className="w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#98a2b3] focus:border-[#08A9C1] focus:ring-4 focus:ring-[#08A9C1]/10 disabled:bg-[#f9fafb]"
            />
          </div>

          {/* DESCRIPTION */}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#344054]">
              {checkpointType ===
              "information"
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
              disabled={isSaving}
              rows={
                checkpointType ===
                "information"
                  ? 6
                  : 4
              }
              placeholder={
                checkpointType ===
                "information"
                  ? "Write the instructions or information trainees should read before continuing..."
                  : checkpointType ===
                      "trainer_session"
                    ? "Explain what trainees should prepare or expect during this session."
                    : "Describe what this assessment evaluates."
              }
              className="w-full resize-y rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm leading-6 text-[#172033] outline-none transition placeholder:text-[#98a2b3] focus:border-[#08A9C1] focus:ring-4 focus:ring-[#08A9C1]/10 disabled:bg-[#f9fafb]"
            />
          </div>

          {/* ASSESSMENT SETTINGS */}

          {checkpointType ===
            "assessment" && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#344054]">
                  Passing score
                </label>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={passingScore}
                    onChange={(event) =>
                      setPassingScore(
                        event.target.value
                      )
                    }
                    disabled={isSaving}
                    className="w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 pr-10 text-sm text-[#172033] outline-none transition focus:border-[#08A9C1] focus:ring-4 focus:ring-[#08A9C1]/10 disabled:bg-[#f9fafb]"
                  />

                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-[#98a2b3]">
                    %
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-[#B9E8EE] bg-[#F0FAFB] px-4 py-3">
                <p className="text-xs leading-5 text-[#08788A]">
                  After creating the assessment,
                  open it again to add questions and
                  configure the quiz.
                </p>
              </div>
            </>
          )}

          {/* TRAINER SESSION SETTINGS */}

          {checkpointType ===
            "trainer_session" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#344054]">
                    Date
                  </label>

                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(event) =>
                      setMeetingDate(
                        event.target.value
                      )
                    }
                    disabled={isSaving}
                    className="w-full rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 text-sm text-[#172033] outline-none focus:border-[#08A9C1] focus:ring-4 focus:ring-[#08A9C1]/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#344054]">
                    Time
                  </label>

                  <input
                    type="time"
                    value={meetingTime}
                    onChange={(event) =>
                      setMeetingTime(
                        event.target.value
                      )
                    }
                    disabled={isSaving}
                    className="w-full rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 text-sm text-[#172033] outline-none focus:border-[#08A9C1] focus:ring-4 focus:ring-[#08A9C1]/10"
                  />
                </div>
              </div>

              {/* OFFICIAL TIMEZONE + LOCAL EQUIVALENCE */}

              <div className="rounded-xl border border-[#B9E8EE] bg-[#F0FAFB] px-4 py-3">
                <p className="text-xs font-semibold text-[#08788A]">
                  Official Time · Colombia / Peru (UTC-5)
                </p>

                <p className="mt-1 text-xs leading-5 text-[#667085]">
                  All session times are entered in
                  Colombia/Peru time, regardless of
                  your location.
                </p>

                {scheduledPreview && (
                  <div className="mt-3">
                    <DualDateTime
                      compact
                      value={scheduledPreview}
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#344054]">
                    Duration
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={duration}
                      onChange={(event) =>
                        setDuration(
                          event.target.value
                        )
                      }
                      disabled={isSaving}
                      placeholder="30"
                      className="w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 pr-14 text-sm text-[#172033] outline-none focus:border-[#08A9C1] focus:ring-4 focus:ring-[#08A9C1]/10"
                    />

                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#98a2b3]">
                      min
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#344054]">
                    Meeting link
                  </label>

                  <input
                    type="url"
                    value={meetingUrl}
                    onChange={(event) =>
                      setMeetingUrl(
                        event.target.value
                      )
                    }
                    disabled={isSaving}
                    placeholder="https://meet.google.com/..."
                    className="w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#98a2b3] focus:border-[#08A9C1] focus:ring-4 focus:ring-[#08A9C1]/10"
                  />
                </div>
              </div>
            </>
          )}

          {/* COMPLETION SETTINGS */}

          <div className="rounded-[16px] border border-[#e4e7ec] bg-[#f9fafb] p-4">
            <p className="text-sm font-semibold text-[#344054]">
              Completion settings
            </p>

            <p className="mt-1 text-xs leading-5 text-[#667085]">
              Control whether this item is required
              and whether the trainee can complete it
              manually.
            </p>

            <div className="mt-4 space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e4e7ec] bg-white p-3.5">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(event) =>
                    setIsRequired(
                      event.target.checked
                    )
                  }
                  disabled={isSaving}
                  className="mt-0.5 h-4 w-4 rounded border-[#d0d5dd] accent-[#08A9C1]"
                />

                <span>
                  <span className="block text-sm font-medium text-[#344054]">
                    Required to complete the day
                  </span>

                  <span className="mt-0.5 block text-xs leading-5 text-[#98a2b3]">
                    The trainee must complete this
                    item before the training day can
                    be completed.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e4e7ec] bg-white p-3.5">
                <input
                  type="checkbox"
                  checked={
                    allowLearnerCompletion
                  }
                  onChange={(event) =>
                    setAllowLearnerCompletion(
                      event.target.checked
                    )
                  }
                  disabled={isSaving}
                  className="mt-0.5 h-4 w-4 rounded border-[#d0d5dd] accent-[#08A9C1]"
                />

                <span>
                  <span className="block text-sm font-medium text-[#344054]">
                    Allow trainee to mark as
                    completed
                  </span>

                  <span className="mt-0.5 block text-xs leading-5 text-[#98a2b3]">
                    Shows a “Mark as completed”
                    action to the trainee for this
                    checkpoint.
                  </span>
                </span>
              </label>
            </div>
          </div>

          {checkpointType ===
            "information" && (
            <div className="rounded-xl border border-[#B9E8EE] bg-[#F0FAFB] px-4 py-3">
              <p className="text-xs leading-5 text-[#08788A]">
                Information blocks do not have a
                score. They can be optional, or you
                can require the trainee to mark them
                as completed before finishing the
                day.
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
        </div>

        {/* FOOTER */}

        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-[#eef0f3] bg-white px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-[#d0d5dd] bg-white px-4 py-2.5 text-sm font-semibold text-[#344054] transition hover:bg-[#f9fafb] disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-xl bg-[#08A9C1] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#07879B] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving
              ? "Creating..."
              : checkpointType ===
                  "trainer_session"
                ? "Add session"
                : checkpointType ===
                    "information"
                  ? "Add information"
                  : "Add assessment"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TypeCard({
  selected,
  title,
  description,
  icon,
  onClick,
  disabled,
}: {
  selected: boolean;
  title: string;
  description: string;
  icon: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-[16px] border p-4 text-left transition ${
        selected
          ? "border-[#08A9C1] bg-[#F0FAFB] shadow-[0_0_0_3px_rgba(8,169,193,0.08)]"
          : "border-[#e4e7ec] bg-white hover:border-[#B9E8EE] hover:bg-[#FAFEFF]"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
          selected
            ? "bg-[#08A9C1] text-white"
            : "bg-[#f2f4f7] text-[#667085]"
        }`}
      >
        {icon}
      </div>

      <p className="mt-3 text-sm font-semibold text-[#172033]">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-[#667085]">
        {description}
      </p>
    </button>
  );
}