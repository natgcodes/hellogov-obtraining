"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AddModuleEditorProps = {
  dayId: string;
  nextPosition: number;
  onClose: () => void;
};

export default function AddModuleEditor({
  dayId,
  onClose,
}: AddModuleEditorProps) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");
  const [objective, setObjective] =
    useState("");
  const [duration, setDuration] =
    useState("");
  const [isRequired, setIsRequired] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  async function handleCreate() {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setErrorMessage(
        "Module title is required."
      );
      return;
    }

    const parsedDuration =
      duration.trim() === ""
        ? null
        : Number(duration);

    if (
      parsedDuration !== null &&
      (!Number.isFinite(parsedDuration) ||
        parsedDuration < 0)
    ) {
      setErrorMessage(
        "Duration must be a valid number."
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    /*
     * Creates both records atomically:
     *
     * 1. Module
     * 2. day_content entry
     *
     * The module is automatically appended to
     * the end of the day's shared content sequence.
     */
    const { error } = await supabase.rpc(
      "create_day_module",
      {
        target_day_id: dayId,
        module_title: cleanTitle,
        module_description:
          description.trim() || null,
        module_objective:
          objective.trim() || null,
        module_duration_minutes:
          parsedDuration,
        module_is_required: isRequired,
      }
    );

    if (error) {
      console.error(
        "Error creating module:",
        error
      );

      setErrorMessage(
        "We couldn't create the module. Please try again."
      );

      setIsSaving(false);
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[1px]">
      <div className="max-h-[90vh] w-full max-w-[620px] overflow-y-auto rounded-[24px] border border-[#e5e7eb] bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-start justify-between border-b border-[#eef0f3] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#07879B]">
              Learning module
            </p>

            <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[#172033]">
              Add module
            </h2>

            <p className="mt-1 text-sm text-[#667085]">
              Add a new learning block to this
              training day.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e4e7ec] text-lg text-[#667085] transition hover:bg-[#f7f8fa] disabled:opacity-50"
            aria-label="Close add module editor"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 p-6">
          {/* TITLE */}
          <div>
            <label
              htmlFor="new-module-title"
              className="mb-1.5 block text-sm font-medium text-[#344054]"
            >
              Module title
            </label>

            <input
              id="new-module-title"
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              disabled={isSaving}
              placeholder="Example: Customer Journey"
              className="w-full rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#98a2b3] focus:border-[#08A9C1] focus:ring-4 focus:ring-[#08A9C1]/10 disabled:bg-[#f9fafb]"
            />
          </div>

          {/* DESCRIPTION */}
          <div>
            <label
              htmlFor="new-module-description"
              className="mb-1.5 block text-sm font-medium text-[#344054]"
            >
              Description
            </label>

            <textarea
              id="new-module-description"
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              disabled={isSaving}
              rows={3}
              placeholder="Briefly describe what this module covers."
              className="w-full resize-y rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 text-sm leading-6 text-[#172033] outline-none transition placeholder:text-[#98a2b3] focus:border-[#08A9C1] focus:ring-4 focus:ring-[#08A9C1]/10 disabled:bg-[#f9fafb]"
            />
          </div>

          {/* OBJECTIVE */}
          <div>
            <label
              htmlFor="new-module-objective"
              className="mb-1.5 block text-sm font-medium text-[#344054]"
            >
              Learning objective
            </label>

            <textarea
              id="new-module-objective"
              value={objective}
              onChange={(event) =>
                setObjective(
                  event.target.value
                )
              }
              disabled={isSaving}
              rows={3}
              placeholder="What should the trainee be able to do after completing this module?"
              className="w-full resize-y rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 text-sm leading-6 text-[#172033] outline-none transition placeholder:text-[#98a2b3] focus:border-[#08A9C1] focus:ring-4 focus:ring-[#08A9C1]/10 disabled:bg-[#f9fafb]"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* DURATION */}
            <div>
              <label
                htmlFor="new-module-duration"
                className="mb-1.5 block text-sm font-medium text-[#344054]"
              >
                Duration
              </label>

              <div className="relative">
                <input
                  id="new-module-duration"
                  type="number"
                  min="0"
                  value={duration}
                  onChange={(event) =>
                    setDuration(
                      event.target.value
                    )
                  }
                  disabled={isSaving}
                  placeholder="60"
                  className="w-full rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 pr-16 text-sm text-[#172033] outline-none transition focus:border-[#08A9C1] focus:ring-4 focus:ring-[#08A9C1]/10 disabled:bg-[#f9fafb]"
                />

                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#98a2b3]">
                  min
                </span>
              </div>
            </div>

            {/* REQUIRED */}
            <div>
              <p className="mb-1.5 text-sm font-medium text-[#344054]">
                Requirement
              </p>

              <label className="flex min-h-[42px] cursor-pointer items-center gap-3 rounded-xl border border-[#d0d5dd] px-3.5">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(event) =>
                    setIsRequired(
                      event.target.checked
                    )
                  }
                  disabled={isSaving}
                  className="h-4 w-4 rounded border-[#d0d5dd] accent-[#08A9C1]"
                />

                <span className="text-sm text-[#475467]">
                  Required module
                </span>
              </label>
            </div>
          </div>

          {/* INFO */}
          <div className="rounded-xl border border-[#B9E8EE] bg-[#F0FAFB] px-4 py-3">
            <p className="text-xs leading-5 text-[#08788A]">
              The new module will be added to the
              end of this training day. You can
              reposition it afterward using the day
              content controls.
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

        {/* FOOTER */}
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
            className="rounded-xl bg-[#172033] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#263247] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving
              ? "Creating..."
              : "Add module"}
          </button>
        </div>
      </div>
    </div>
  );
}