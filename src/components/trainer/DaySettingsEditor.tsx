"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type EditableDay = {
  id: string;
  day_number: number;
  title: string;
  description: string | null;
  is_published: boolean;
};

type DaySettingsEditorProps = {
  day: EditableDay;
  onClose: () => void;
};

export default function DaySettingsEditor({
  day,
  onClose,
}: DaySettingsEditorProps) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState(day.title);
  const [description, setDescription] = useState(
    day.description ?? ""
  );
  const [isPublished, setIsPublished] = useState(
    day.is_published
  );

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null
  );

  useEffect(() => {
    setTitle(day.title);
    setDescription(day.description ?? "");
    setIsPublished(day.is_published);
    setErrorMessage(null);
  }, [day]);

  async function handleSave() {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setErrorMessage("Day title is required.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const { error } = await supabase
      .from("days")
      .update({
        title: cleanTitle,
        description: description.trim() || null,
        is_published: isPublished,
      })
      .eq("id", day.id);

    if (error) {
      console.error("Error updating day:", error);
      setErrorMessage(
        "We couldn't save the day settings. Please try again."
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
        <div className="flex items-start justify-between border-b border-[#eef0f3] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
              Day {day.day_number}
            </p>

            <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[#172033]">
              Edit day settings
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e4e7ec] text-lg text-[#667085] transition hover:bg-[#f7f8fa] disabled:opacity-50"
            aria-label="Close day settings"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <label
              htmlFor="day-title"
              className="mb-1.5 block text-sm font-medium text-[#344054]"
            >
              Day title
            </label>

            <input
              id="day-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isSaving}
              className="w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm text-[#172033] outline-none transition focus:border-[#4f7cff] focus:ring-4 focus:ring-[#4f7cff]/10 disabled:bg-[#f9fafb]"
            />
          </div>

          <div>
            <label
              htmlFor="day-description"
              className="mb-1.5 block text-sm font-medium text-[#344054]"
            >
              Description
            </label>

            <textarea
              id="day-description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              disabled={isSaving}
              rows={4}
              placeholder="Describe the focus and learning goals for this day."
              className="w-full resize-none rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm leading-6 text-[#172033] outline-none transition focus:border-[#4f7cff] focus:ring-4 focus:ring-[#4f7cff]/10 disabled:bg-[#f9fafb]"
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-[#344054]">
              Visibility
            </p>

            <div className="space-y-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#d0d5dd] p-4 transition hover:bg-[#fcfcfd]">
                <input
                  type="radio"
                  name="day-status"
                  checked={!isPublished}
                  onChange={() => setIsPublished(false)}
                  disabled={isSaving}
                  className="mt-0.5 h-4 w-4"
                />

                <div>
                  <p className="text-sm font-medium text-[#344054]">
                    Draft
                  </p>

                  <p className="mt-0.5 text-xs leading-5 text-[#98a2b3]">
                    Keep this day hidden from learners while the
                    training team continues editing it.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#d0d5dd] p-4 transition hover:bg-[#fcfcfd]">
                <input
                  type="radio"
                  name="day-status"
                  checked={isPublished}
                  onChange={() => setIsPublished(true)}
                  disabled={isSaving}
                  className="mt-0.5 h-4 w-4"
                />

                <div>
                  <p className="text-sm font-medium text-[#344054]">
                    Published
                  </p>

                  <p className="mt-0.5 text-xs leading-5 text-[#98a2b3]">
                    Make this day available as part of the
                    published learner experience.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-[#e4e7ec] bg-[#f9fafb] px-4 py-3">
            <p className="text-xs leading-5 text-[#667085]">
              Publishing a day controls its visibility, but learner
              access rules such as completion requirements and day
              unlocking will be managed separately.
            </p>
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
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-xl bg-[#e84545] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#cf3636] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}