"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type EditableModule = {
  id: string;
  title: string;
  description: string | null;
  objective: string | null;
  duration_minutes: number | null;
  position: number;
  is_required: boolean;
};

type ModuleEditorProps = {
  module: EditableModule;
  onClose: () => void;
};

export default function ModuleEditor({
  module,
  onClose,
}: ModuleEditorProps) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState(module.title);
  const [description, setDescription] = useState(
    module.description ?? ""
  );
  const [objective, setObjective] = useState(
    module.objective ?? ""
  );
  const [duration, setDuration] = useState(
    module.duration_minutes?.toString() ?? ""
  );
  const [isRequired, setIsRequired] = useState(
    module.is_required
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] =
    useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(
    null
  );

  useEffect(() => {
    setTitle(module.title);
    setDescription(module.description ?? "");
    setObjective(module.objective ?? "");
    setDuration(module.duration_minutes?.toString() ?? "");
    setIsRequired(module.is_required);
    setErrorMessage(null);
    setShowDeleteConfirmation(false);
  }, [module]);

  async function handleSave() {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setErrorMessage("Module title is required.");
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

    const { error } = await supabase
      .from("modules")
      .update({
        title: cleanTitle,
        description: description.trim() || null,
        objective: objective.trim() || null,
        duration_minutes: parsedDuration,
        is_required: isRequired,
      })
      .eq("id", module.id);

    if (error) {
      console.error("Error updating module:", error);
      setErrorMessage(
        "We couldn't save the module. Please try again."
      );
      setIsSaving(false);
      return;
    }

    router.refresh();
    onClose();
  }

  async function handleDelete() {
    setIsDeleting(true);
    setErrorMessage(null);

    const { error } = await supabase
      .from("modules")
      .delete()
      .eq("id", module.id);

    if (error) {
      console.error("Error deleting module:", error);
      setErrorMessage(
        "We couldn't delete the module. Please try again."
      );
      setIsDeleting(false);
      setShowDeleteConfirmation(false);
      return;
    }

    router.refresh();
    onClose();
  }

  const isBusy = isSaving || isDeleting;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[1px]">
      <div className="max-h-[90vh] w-full max-w-[620px] overflow-y-auto rounded-[24px] border border-[#e5e7eb] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#eef0f3] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
              Module settings
            </p>

            <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[#172033]">
              Edit module
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e4e7ec] text-lg text-[#667085] transition hover:bg-[#f7f8fa] hover:text-[#172033] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close module editor"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <label
              htmlFor="module-title"
              className="mb-1.5 block text-sm font-medium text-[#344054]"
            >
              Module title
            </label>

            <input
              id="module-title"
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              disabled={isBusy}
              className="w-full rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#98a2b3] focus:border-[#4f7cff] focus:ring-4 focus:ring-[#4f7cff]/10 disabled:bg-[#f9fafb]"
            />
          </div>

          <div>
            <label
              htmlFor="module-description"
              className="mb-1.5 block text-sm font-medium text-[#344054]"
            >
              Description
            </label>

            <textarea
              id="module-description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              disabled={isBusy}
              rows={3}
              className="w-full resize-none rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 text-sm leading-6 text-[#172033] outline-none transition placeholder:text-[#98a2b3] focus:border-[#4f7cff] focus:ring-4 focus:ring-[#4f7cff]/10 disabled:bg-[#f9fafb]"
              placeholder="Briefly describe what this module covers."
            />
          </div>

          <div>
            <label
              htmlFor="module-objective"
              className="mb-1.5 block text-sm font-medium text-[#344054]"
            >
              Learning objective
            </label>

            <textarea
              id="module-objective"
              value={objective}
              onChange={(event) =>
                setObjective(event.target.value)
              }
              disabled={isBusy}
              rows={3}
              className="w-full resize-none rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 text-sm leading-6 text-[#172033] outline-none transition placeholder:text-[#98a2b3] focus:border-[#4f7cff] focus:ring-4 focus:ring-[#4f7cff]/10 disabled:bg-[#f9fafb]"
              placeholder="What should the learner be able to do after completing this module?"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="module-duration"
                className="mb-1.5 block text-sm font-medium text-[#344054]"
              >
                Duration
              </label>

              <div className="relative">
                <input
                  id="module-duration"
                  type="number"
                  min="0"
                  value={duration}
                  onChange={(event) =>
                    setDuration(event.target.value)
                  }
                  disabled={isBusy}
                  className="w-full rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 pr-16 text-sm text-[#172033] outline-none transition focus:border-[#4f7cff] focus:ring-4 focus:ring-[#4f7cff]/10 disabled:bg-[#f9fafb]"
                  placeholder="60"
                />

                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#98a2b3]">
                  min
                </span>
              </div>
            </div>

            <div>
              <p className="mb-1.5 block text-sm font-medium text-[#344054]">
                Requirement
              </p>

              <label className="flex min-h-[42px] cursor-pointer items-center gap-3 rounded-xl border border-[#d0d5dd] px-3.5">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(event) =>
                    setIsRequired(event.target.checked)
                  }
                  disabled={isBusy}
                  className="h-4 w-4 rounded border-[#d0d5dd]"
                />

                <span className="text-sm text-[#475467]">
                  Required module
                </span>
              </label>
            </div>
          </div>

          <div className="rounded-xl bg-[#f9fafb] px-4 py-3">
            <p className="text-xs leading-5 text-[#667085]">
              Materials and practice activities will be managed
              separately inside this module.
            </p>
          </div>

          {/* Danger zone */}
          <div className="border-t border-[#eef0f3] pt-5">
            {!showDeleteConfirmation ? (
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[#fecdca] bg-[#fffafa] px-4 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-[#b42318]">
                    Delete module
                  </p>

                  <p className="mt-0.5 text-xs leading-5 text-[#667085]">
                    Permanently remove this module from the training day.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowDeleteConfirmation(true)
                  }
                  disabled={isBusy}
                  className="shrink-0 rounded-lg border border-[#fda29b] bg-white px-3 py-2 text-xs font-semibold text-[#b42318] transition hover:bg-[#fef3f2] disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-[#fda29b] bg-[#fef3f2] p-4">
                <p className="text-sm font-semibold text-[#b42318]">
                  Delete “{module.title}”?
                </p>

                <p className="mt-1.5 text-xs leading-5 text-[#912018]">
                  This action cannot be undone. Any content linked to
                  this module may also be removed.
                </p>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setShowDeleteConfirmation(false)
                    }
                    disabled={isBusy}
                    className="rounded-lg border border-[#d0d5dd] bg-white px-3 py-2 text-xs font-semibold text-[#344054] transition hover:bg-[#f9fafb] disabled:opacity-50"
                  >
                    Keep module
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isBusy}
                    className="rounded-lg bg-[#d92d20] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#b42318] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeleting
                      ? "Deleting..."
                      : "Yes, delete module"}
                  </button>
                </div>
              </div>
            )}
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
            disabled={isBusy}
            className="rounded-xl border border-[#d0d5dd] bg-white px-4 py-2.5 text-sm font-semibold text-[#344054] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isBusy}
            className="rounded-xl bg-[#e84545] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#cf3636] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}