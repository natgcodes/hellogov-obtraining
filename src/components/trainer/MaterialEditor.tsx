"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type EditableMaterial = {
  id: string;
  title: string;
  description: string | null;
  material_type: string;
  url: string | null;
  is_required: boolean;
  position: number;
};

type MaterialEditorProps = {
  material: EditableMaterial;
  onClose: () => void;
};

export default function MaterialEditor({
  material,
  onClose,
}: MaterialEditorProps) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState(material.title);
  const [description, setDescription] = useState(
    material.description ?? ""
  );
  const [materialType, setMaterialType] = useState(
    material.material_type
  );
  const [url, setUrl] = useState(material.url ?? "");
  const [isRequired, setIsRequired] = useState(
    material.is_required
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] =
    useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null
  );

  useEffect(() => {
    setTitle(material.title);
    setDescription(material.description ?? "");
    setMaterialType(material.material_type);
    setUrl(material.url ?? "");
    setIsRequired(material.is_required);
    setErrorMessage(null);
    setShowDeleteConfirmation(false);
  }, [material]);

  async function handleSave() {
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

    const { error } = await supabase
      .from("materials")
      .update({
        title: cleanTitle,
        description: description.trim() || null,
        material_type: materialType,
        url: cleanUrl || null,
        is_required: isRequired,
      })
      .eq("id", material.id);

    if (error) {
      console.error("Error updating material:", error);
      setErrorMessage(
        "We couldn't save the material. Please try again."
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
      .from("materials")
      .delete()
      .eq("id", material.id);

    if (error) {
      console.error("Error deleting material:", error);
      setErrorMessage(
        "We couldn't delete the material. Please try again."
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[1px]">
      <div className="max-h-[90vh] w-full max-w-[620px] overflow-y-auto rounded-[24px] border border-[#e5e7eb] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#eef0f3] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
              Learning resource
            </p>

            <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[#172033]">
              Edit material
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e4e7ec] text-lg text-[#667085] transition hover:bg-[#f7f8fa] disabled:opacity-50"
            aria-label="Close material editor"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <label
              htmlFor="material-title"
              className="mb-1.5 block text-sm font-medium text-[#344054]"
            >
              Material title
            </label>

            <input
              id="material-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isBusy}
              className="w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm text-[#172033] outline-none transition focus:border-[#4f7cff] focus:ring-4 focus:ring-[#4f7cff]/10 disabled:bg-[#f9fafb]"
            />
          </div>

          <div>
            <label
              htmlFor="material-description"
              className="mb-1.5 block text-sm font-medium text-[#344054]"
            >
              Description
            </label>

            <textarea
              id="material-description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              disabled={isBusy}
              rows={3}
              className="w-full resize-none rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm leading-6 text-[#172033] outline-none transition focus:border-[#4f7cff] focus:ring-4 focus:ring-[#4f7cff]/10 disabled:bg-[#f9fafb]"
              placeholder="Briefly describe this resource."
            />
          </div>

          <div>
            <label
              htmlFor="material-type"
              className="mb-1.5 block text-sm font-medium text-[#344054]"
            >
              Resource type
            </label>

            <select
              id="material-type"
              value={materialType}
              onChange={(event) =>
                setMaterialType(event.target.value)
              }
              disabled={isBusy}
              className="w-full rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 text-sm text-[#172033] outline-none transition focus:border-[#4f7cff] focus:ring-4 focus:ring-[#4f7cff]/10 disabled:bg-[#f9fafb]"
            >
              <option value="link">Link</option>
              <option value="video">Video</option>
              <option value="document">Document</option>
              <option value="presentation">Presentation</option>
              <option value="reading">Reading</option>
              <option value="other">Other resource</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="material-url"
              className="mb-1.5 block text-sm font-medium text-[#344054]"
            >
              Resource URL
            </label>

            <input
              id="material-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              disabled={isBusy}
              placeholder="https://..."
              className="w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#98a2b3] focus:border-[#4f7cff] focus:ring-4 focus:ring-[#4f7cff]/10 disabled:bg-[#f9fafb]"
            />

            <p className="mt-1.5 text-xs leading-5 text-[#98a2b3]">
              You can add a Google Drive, Google Docs, Slides,
              YouTube, Loom or other external resource.
            </p>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-[#344054]">
              Requirement
            </p>

            <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-[#d0d5dd] px-3.5">
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
                Required material
              </span>
            </label>
          </div>

          <div className="border-t border-[#eef0f3] pt-5">
            {!showDeleteConfirmation ? (
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[#fecdca] bg-[#fffafa] px-4 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-[#b42318]">
                    Delete material
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-[#667085]">
                    Permanently remove this resource from the module.
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
                  Delete “{material.title}”?
                </p>

                <p className="mt-1.5 text-xs leading-5 text-[#912018]">
                  This action cannot be undone.
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
                    Keep material
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isBusy}
                    className="rounded-lg bg-[#d92d20] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#b42318] disabled:opacity-60"
                  >
                    {isDeleting
                      ? "Deleting..."
                      : "Yes, delete material"}
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
            className="rounded-xl border border-[#d0d5dd] bg-white px-4 py-2.5 text-sm font-semibold text-[#344054] transition hover:bg-[#f9fafb] disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isBusy}
            className="rounded-xl bg-[#e84545] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#cf3636] disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}