"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type SetupItem = {
  id: string;
  program_id: string;
  title: string;
  description: string | null;
  position: number;
  is_required: boolean;
};

type Props = {
  items: SetupItem[];
  programId: string;
  onClose: () => void;
};

export default function SetupEditor({
  items,
  programId,
  onClose,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [editingId, setEditingId] = useState<string | null>(
    null
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isRequired, setIsRequired] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setIsRequired(true);
    setError(null);
  }

  function editItem(item: SetupItem) {
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description ?? "");
    setIsRequired(item.is_required);
    setError(null);
  }

  async function saveItem() {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setError("Item title is required.");
      return;
    }

    setIsSaving(true);
    setError(null);

    if (editingId) {
      const { error: updateError } = await supabase
        .from("setup_items")
        .update({
          title: cleanTitle,
          description: description.trim() || null,
          is_required: isRequired,
        })
        .eq("id", editingId);

      if (updateError) {
        setError("We couldn't update this setup item.");
        setIsSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from("setup_items")
        .insert({
          program_id: programId,
          title: cleanTitle,
          description: description.trim() || null,
          is_required: isRequired,
          position: items.length + 1,
        });

      if (insertError) {
        setError("We couldn't create this setup item.");
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(false);
    resetForm();
    router.refresh();
  }

  async function deleteItem(item: SetupItem) {
    const confirmed = window.confirm(
      `Delete "${item.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("setup_items")
      .delete()
      .eq("id", item.id);

    if (deleteError) {
      setError("We couldn't delete this setup item.");
      return;
    }

    if (editingId === item.id) {
      resetForm();
    }

    router.refresh();
  }

  async function moveItem(
    index: number,
    direction: "up" | "down"
  ) {
    if (isReordering) return;

    const targetIndex =
      direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= items.length) {
      return;
    }

    const current = items[index];
    const target = items[targetIndex];

    setIsReordering(true);
    setError(null);

    const tempCurrent = -200001;
    const tempTarget = -200002;

    const { error: e1 } = await supabase
      .from("setup_items")
      .update({ position: tempCurrent })
      .eq("id", current.id);

    if (e1) {
      setError("We couldn't change the item order.");
      setIsReordering(false);
      return;
    }

    const { error: e2 } = await supabase
      .from("setup_items")
      .update({ position: tempTarget })
      .eq("id", target.id);

    if (e2) {
      await supabase
        .from("setup_items")
        .update({ position: current.position })
        .eq("id", current.id);

      setError("We couldn't change the item order.");
      setIsReordering(false);
      return;
    }

    const { error: e3 } = await supabase
      .from("setup_items")
      .update({ position: target.position })
      .eq("id", current.id);

    const { error: e4 } = await supabase
      .from("setup_items")
      .update({ position: current.position })
      .eq("id", target.id);

    if (e3 || e4) {
      setError("We couldn't change the item order.");
    }

    setIsReordering(false);
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-[1px]">
      <div className="h-full w-full max-w-[760px] overflow-y-auto border-l border-[#e5e7eb] bg-[#f7f8fa] shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-[#e9ebef] bg-white/95 px-8 py-6 backdrop-blur">
          <div className="flex items-start justify-between gap-5">
            <div>
              <span className="rounded-full bg-[#f2f4f7] px-2.5 py-1 text-xs font-semibold text-[#667085]">
                Before Day 1
              </span>

              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-[#172033]">
                Tool Setup
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#667085]">
                Define everything learners need before onboarding
                begins.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e4e7ec] bg-white text-lg text-[#667085]"
            >
              ×
            </button>
          </div>
        </div>

        <div className="space-y-6 p-8">
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="rounded-[18px] border border-[#e5e7eb] bg-white p-5"
              >
                <div className="flex justify-between gap-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-[#172033]">
                        {item.title}
                      </h3>

                      <span className="rounded-full bg-[#f2f4f7] px-2 py-0.5 text-[10px] font-semibold text-[#667085]">
                        {item.is_required
                          ? "Required"
                          : "Optional"}
                      </span>
                    </div>

                    {item.description && (
                      <p className="mt-1.5 text-sm leading-5 text-[#667085]">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => moveItem(index, "up")}
                      disabled={
                        index === 0 || isReordering
                      }
                      className="h-8 w-8 rounded-lg border border-[#e4e7ec] text-xs disabled:opacity-30"
                    >
                      ↑
                    </button>

                    <button
                      onClick={() => moveItem(index, "down")}
                      disabled={
                        index === items.length - 1 ||
                        isReordering
                      }
                      className="h-8 w-8 rounded-lg border border-[#e4e7ec] text-xs disabled:opacity-30"
                    >
                      ↓
                    </button>

                    <button
                      onClick={() => editItem(item)}
                      className="rounded-lg px-3 text-xs font-semibold text-[#475467] hover:bg-[#f2f4f7]"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => deleteItem(item)}
                      className="rounded-lg px-3 text-xs font-semibold text-[#b42318] hover:bg-[#fef3f2]"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-[20px] border border-[#e5e7eb] bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
              {editingId ? "Edit item" : "Add setup item"}
            </p>

            <div className="mt-5 space-y-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Item title"
                className="w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm outline-none"
              />

              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                placeholder="Description"
                rows={3}
                className="w-full resize-none rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm outline-none"
              />

              <label className="flex items-center gap-2 text-sm text-[#475467]">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) =>
                    setIsRequired(e.target.checked)
                  }
                />
                Required
              </label>

              {error && (
                <p className="text-sm text-[#b42318]">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                {editingId && (
                  <button
                    onClick={resetForm}
                    className="rounded-xl border border-[#d0d5dd] px-4 py-2.5 text-sm font-semibold text-[#344054]"
                  >
                    Cancel edit
                  </button>
                )}

                <button
                  onClick={saveItem}
                  disabled={isSaving}
                  className="rounded-xl bg-[#e84545] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isSaving
                    ? "Saving..."
                    : editingId
                      ? "Save changes"
                      : "Add item"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}