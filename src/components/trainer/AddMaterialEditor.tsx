"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AddMaterialEditorProps = {
  moduleId: string;
  nextPosition: number;
  onClose: () => void;
};

export default function AddMaterialEditor({
  moduleId,
  nextPosition,
  onClose,
}: AddMaterialEditorProps) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [materialType, setMaterialType] = useState("link");
  const [url, setUrl] = useState("");
  const [isRequired, setIsRequired] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null
  );

  async function handleCreate() {
    const cleanTitle = title.trim();
    const cleanUrl = url.trim();

    if (!cleanTitle) {
      setErrorMessage("Material title is required.");
      return;
    }

    if (cleanUrl) {
      try {
        new URL(cleanUrl);
      } catch {
        setErrorMessage(
          "Please enter a valid URL, including https://"
        );
        return;
      }
    }

    setIsSaving(true);
    setErrorMessage(null);

    const { error } = await supabase.from("materials").insert({
      module_id: moduleId,
      title: cleanTitle,
      description: description.trim() || null,
      material_type: materialType,
      url: cleanUrl || null,
      is_required: isRequired,
      position: nextPosition,
    });

    if (error) {
      console.error("Error creating material:", error);
      setErrorMessage(
        "We couldn't create the material. Please try again."
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
              Learning resource
            </p>

            <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[#172033]">
              Add material
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e4e7ec] text-lg text-[#667085] transition hover:bg-[#f7f8fa] disabled:opacity-50"
            aria-label="Close add material editor"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <label
              htmlFor="new-material-title"
              className="mb-1.5 block text-sm font-medium text-[#344054]"
            >
              Material title
            </label>

            <input
              id="new-material-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Example: Training Charts"
              className="w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#98a2b3] focus:border-[#4f7cff] focus:ring-4 focus:ring-[#4f7cff]/10"
            />
          </div>

          <div>
            <label
              htmlFor="new-material-description"
              className="mb-1.5 block text-sm font-medium text-[#344054]"
            >
              Description
            </label>

            <textarea
              id="new-material-description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              rows={3}
              placeholder="Briefly explain what this resource contains."
              className="w-full resize-none rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm leading-6 text-[#172033] outline-none transition placeholder:text-[#98a2b3] focus:border-[#4f7cff] focus:ring-4 focus:ring-[#4f7cff]/10"
            />
          </div>

          <div>
            <label
              htmlFor="new-material-type"
              className="mb-1.5 block text-sm font-medium text-[#344054]"
            >
              Resource type
            </label>

            <select
              id="new-material-type"
              value={materialType}
              onChange={(event) =>
                setMaterialType(event.target.value)
              }
              className="w-full rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 text-sm text-[#172033] outline-none transition focus:border-[#4f7cff] focus:ring-4 focus:ring-[#4f7cff]/10"
            >
              <option value="link">External Link</option>
              <option value="video">Video</option>
              <option value="document">Document</option>
              <option value="presentation">Presentation</option>
              <option value="reading">Reading</option>
              <option value="other">Other Resource</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="new-material-url"
              className="mb-1.5 block text-sm font-medium text-[#344054]"
            >
              Resource URL
            </label>

            <input
              id="new-material-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#98a2b3] focus:border-[#4f7cff] focus:ring-4 focus:ring-[#4f7cff]/10"
            />

            <p className="mt-1.5 text-xs leading-5 text-[#98a2b3]">
              You can use links from Google Drive, Docs, Slides,
              YouTube, Loom or another external resource.
            </p>
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
                Required material
              </span>
            </label>
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
            {isSaving ? "Creating..." : "Add material"}
          </button>
        </div>
      </div>
    </div>
  );
}