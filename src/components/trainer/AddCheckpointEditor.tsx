"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [checkpointType, setCheckpointType] =
    useState("knowledge");
  const [passingScore, setPassingScore] = useState("80");

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null
  );

  async function handleSave() {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setErrorMessage("Checkpoint title is required.");
      return;
    }

    let parsedPassingScore: number | null = null;

    if (passingScore.trim() !== "") {
      parsedPassingScore = Number(passingScore);

      if (
        !Number.isFinite(parsedPassingScore) ||
        parsedPassingScore < 0 ||
        parsedPassingScore > 100
      ) {
        setErrorMessage(
          "Passing score must be a number between 0 and 100."
        );
        return;
      }
    }

    setIsSaving(true);
    setErrorMessage(null);

    /*
     * Creates both records atomically:
     *
     * 1. Internal quiz used by the checkpoint
     * 2. Checkpoint linked through checkpoints.quiz_id
     *
     * The database function handles both inserts in the
     * same transaction, preventing orphan quizzes.
     */
    const { error } = await supabase.rpc(
      "create_checkpoint_assessment",
      {
        target_day_id: dayId,
        checkpoint_title: cleanTitle,
        checkpoint_description:
          description.trim() || null,
        target_checkpoint_type: checkpointType,
        target_passing_score: parsedPassingScore,
        target_position: nextPosition,
      }
    );

    if (error) {
      console.error(
        "Error creating checkpoint assessment:",
        error
      );

      setErrorMessage(
        "We couldn't create this checkpoint. Please try again."
      );

      setIsSaving(false);
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[1px]">
      <div className="max-h-[90vh] w-full max-w-[620px] overflow-y-auto rounded-[24px] border border-[#e5e7eb] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#eef0f3] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6847df]">
              Checkpoint
            </p>

            <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[#172033]">
              Add checkpoint
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e4e7ec] text-lg text-[#667085] transition hover:bg-[#f7f8fa] disabled:opacity-50"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#344054]">
              Title
            </label>

            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              disabled={isSaving}
              placeholder="e.g. Mid-Day Knowledge Check"
              className="w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm text-[#172033] outline-none transition focus:border-[#4f7cff] focus:ring-4 focus:ring-[#4f7cff]/10 disabled:bg-[#f9fafb]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#344054]">
              Description
            </label>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              disabled={isSaving}
              rows={3}
              placeholder="Describe what this checkpoint evaluates."
              className="w-full resize-none rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm leading-6 text-[#172033] outline-none transition focus:border-[#4f7cff] focus:ring-4 focus:ring-[#4f7cff]/10 disabled:bg-[#f9fafb]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#344054]">
              Checkpoint type
            </label>

            <select
              value={checkpointType}
              onChange={(event) =>
                setCheckpointType(event.target.value)
              }
              disabled={isSaving}
              className="w-full rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 text-sm text-[#172033] outline-none transition focus:border-[#4f7cff] focus:ring-4 focus:ring-[#4f7cff]/10 disabled:bg-[#f9fafb]"
            >
              <option value="knowledge">Knowledge</option>
              <option value="practical">Practical</option>
              <option value="mock_call">Mock Call</option>
              <option value="trainer_review">
                Trainer Review
              </option>
              <option value="other">Other</option>
            </select>
          </div>

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
                  setPassingScore(event.target.value)
                }
                disabled={isSaving}
                placeholder="80"
                className="w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 pr-10 text-sm text-[#172033] outline-none transition focus:border-[#4f7cff] focus:ring-4 focus:ring-[#4f7cff]/10 disabled:bg-[#f9fafb]"
              />

              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-[#98a2b3]">
                %
              </span>
            </div>

            <p className="mt-1.5 text-xs leading-5 text-[#98a2b3]">
              Leave blank if this checkpoint does not require a
              numerical passing score.
            </p>
          </div>

          <div className="rounded-xl border border-[#d9d6fe] bg-[#f4f3ff] px-4 py-3">
            <p className="text-xs leading-5 text-[#5925dc]">
              After creating the checkpoint, open it again to add
              questions and configure the assessment.
            </p>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3">
              <p className="text-sm text-[#b42318]">
                {errorMessage}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#eef0f3] px-6 py-5">
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
            className="rounded-xl bg-[#e84545] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#cf3636] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Creating..." : "Add checkpoint"}
          </button>
        </div>
      </div>
    </div>
  );
}