"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AddActivityEditorProps = {
  moduleId: string;
  nextPosition: number;
  onClose: () => void;
};

export default function AddActivityEditor({
  moduleId,
  nextPosition,
  onClose,
}: AddActivityEditorProps) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [activityType, setActivityType] = useState("practice");
  const [duration, setDuration] = useState("");
  const [isRequired, setIsRequired] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null
  );

  async function handleCreate() {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setErrorMessage("Activity title is required.");
      return;
    }

    const parsedDuration =
      duration.trim() === "" ? null : Number(duration);

    if (
      parsedDuration !== null &&
      (!Number.isFinite(parsedDuration) || parsedDuration < 0)
    ) {
      setErrorMessage("Duration must be a valid number.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const { error } = await supabase.from("activities").insert({
      module_id: moduleId,
      title: cleanTitle,
      description: description.trim() || null,
      instructions: instructions.trim() || null,
      activity_type: activityType,
      duration_minutes: parsedDuration,
      is_required: isRequired,
      position: nextPosition,
    });

    if (error) {
      console.error("Error creating activity:", error);
      setErrorMessage(
        "We couldn't create the activity. Please try again."
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
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
              Practice activity
            </p>

            <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[#172033]">
              Add activity
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e4e7ec] text-lg text-[#667085] transition hover:bg-[#f7f8fa] disabled:opacity-50"
            aria-label="Close add activity editor"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <label
              htmlFor="new-activity-title"
              className="mb-1.5 block text-sm font-medium text-[#344054]"
            >
              Activity title
            </label>

            <input
              id="new-activity-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Example: Practice Customer Call"
              className="w-full rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#98a2b3] focus:border-[#4f7cff] focus:ring-4 focus:ring-[#4f7cff]/10"
            />
          </div>

          <div>
            <label
              htmlFor="new-activity-description"
              className="mb-1.5 block text-sm font-medium text-[#344054]"
            >
              Description
            </label>

            <textarea
              id="new-activity-description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              rows={3}
              placeholder="Briefly describe the purpose of this activity."
              className="w-full resize-none rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 text-sm leading-6 text-[#172033] outline-none transition placeholder:text-[#98a2b3] focus:border-[#4f7cff] focus:ring-4 focus:ring-[#4f7cff]/10"
            />
          </div>

          <div>
            <label
              htmlFor="new-activity-instructions"
              className="mb-1.5 block text-sm font-medium text-[#344054]"
            >
              Instructions
            </label>

            <textarea
              id="new-activity-instructions"
              value={instructions}
              onChange={(event) =>
                setInstructions(event.target.value)
              }
              rows={4}
              placeholder="Explain what the learner needs to do."
              className="w-full resize-none rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 text-sm leading-6 text-[#172033] outline-none transition placeholder:text-[#98a2b3] focus:border-[#4f7cff] focus:ring-4 focus:ring-[#4f7cff]/10"
            />
          </div>

          <div>
            <label
              htmlFor="new-activity-type"
              className="mb-1.5 block text-sm font-medium text-[#344054]"
            >
              Activity type
            </label>

            <select
              id="new-activity-type"
              value={activityType}
              onChange={(event) =>
                setActivityType(event.target.value)
              }
              className="w-full rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 text-sm text-[#172033] outline-none transition focus:border-[#4f7cff] focus:ring-4 focus:ring-[#4f7cff]/10"
            >
              <option value="practice">Practice</option>
              <option value="written">Written Practice</option>
              <option value="case">Case Study</option>
              <option value="roleplay">Role Play</option>
              <option value="mock_call">Mock Call</option>
              <option value="shadowing">Shadowing</option>
              <option value="other">Other Activity</option>
            </select>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="new-activity-duration"
                className="mb-1.5 block text-sm font-medium text-[#344054]"
              >
                Duration
              </label>

              <div className="relative">
                <input
                  id="new-activity-duration"
                  type="number"
                  min="0"
                  value={duration}
                  onChange={(event) =>
                    setDuration(event.target.value)
                  }
                  placeholder="30"
                  className="w-full rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 pr-16 text-sm text-[#172033] outline-none transition focus:border-[#4f7cff] focus:ring-4 focus:ring-[#4f7cff]/10"
                />

                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#98a2b3]">
                  min
                </span>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium text-[#344054]">
                Requirement
              </p>

              <label className="flex min-h-[42px] cursor-pointer items-center gap-3 rounded-xl border border-[#d0d5dd] px-3.5">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(event) =>
                    setIsRequired(event.target.checked)
                  }
                  className="h-4 w-4 rounded border-[#d0d5dd]"
                />

                <span className="text-sm text-[#475467]">
                  Required activity
                </span>
              </label>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mx-6 mb-5 rounded-xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3">
            <p className="text-sm text-[#b42318]">
              {errorMessage}
            </p>
          </div>
        )}

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
            onClick={handleCreate}
            disabled={isSaving}
            className="rounded-xl bg-[#e84545] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#cf3636] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Creating..." : "Add activity"}
          </button>
        </div>
      </div>
    </div>
  );
}