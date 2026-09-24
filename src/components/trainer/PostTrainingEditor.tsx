"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Stage = {
  id: string;
  title: string;
  description: string | null;
  position: number;
};

type PostTraining = {
  id: string;
  program_id: string;
  title: string;
  description: string | null;
  disclaimer: string | null;
  post_training_stages: Stage[];
};

type Props = {
  postTraining: PostTraining;
  onClose: () => void;
};

export default function PostTrainingEditor({
  postTraining,
  onClose,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState(postTraining.title);
  const [description, setDescription] = useState(
    postTraining.description ?? ""
  );
  const [disclaimer, setDisclaimer] = useState(
    postTraining.disclaimer ?? ""
  );

  const [editingId, setEditingId] = useState<string | null>(
    null
  );
  const [stageTitle, setStageTitle] = useState("");
  const [stageDescription, setStageDescription] =
    useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stages = postTraining.post_training_stages ?? [];

  function resetStage() {
    setEditingId(null);
    setStageTitle("");
    setStageDescription("");
  }

  function startEdit(stage: Stage) {
    setEditingId(stage.id);
    setStageTitle(stage.title);
    setStageDescription(stage.description ?? "");
  }

  async function saveSettings() {
    if (!title.trim()) {
      setError("Post-training title is required.");
      return;
    }

    setBusy(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("post_training")
      .update({
        title: title.trim(),
        description: description.trim() || null,
        disclaimer: disclaimer.trim() || null,
      })
      .eq("id", postTraining.id);

    setBusy(false);

    if (updateError) {
      setError("We couldn't update post-training.");
      return;
    }

    router.refresh();
  }

  async function saveStage() {
    if (!stageTitle.trim()) {
      setError("Stage title is required.");
      return;
    }

    setBusy(true);
    setError(null);

    if (editingId) {
      const { error: updateError } = await supabase
        .from("post_training_stages")
        .update({
          title: stageTitle.trim(),
          description:
            stageDescription.trim() || null,
        })
        .eq("id", editingId);

      if (updateError) {
        setError("We couldn't update this stage.");
        setBusy(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from("post_training_stages")
        .insert({
          post_training_id: postTraining.id,
          title: stageTitle.trim(),
          description:
            stageDescription.trim() || null,
          position: stages.length + 1,
        });

      if (insertError) {
        setError("We couldn't create this stage.");
        setBusy(false);
        return;
      }
    }

    setBusy(false);
    resetStage();
    router.refresh();
  }

  async function deleteStage(stage: Stage) {
    if (
      !window.confirm(
        `Delete "${stage.title}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    const { error: deleteError } = await supabase
      .from("post_training_stages")
      .delete()
      .eq("id", stage.id);

    if (deleteError) {
      setError("We couldn't delete this stage.");
      return;
    }

    router.refresh();
  }

  async function moveStage(
    index: number,
    direction: "up" | "down"
  ) {
    if (busy) return;

    const targetIndex =
      direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= stages.length) {
      return;
    }

    const current = stages[index];
    const target = stages[targetIndex];

    setBusy(true);
    setError(null);

    await supabase
      .from("post_training_stages")
      .update({ position: -400001 })
      .eq("id", current.id);

    await supabase
      .from("post_training_stages")
      .update({ position: -400002 })
      .eq("id", target.id);

    const { error: e1 } = await supabase
      .from("post_training_stages")
      .update({ position: target.position })
      .eq("id", current.id);

    const { error: e2 } = await supabase
      .from("post_training_stages")
      .update({ position: current.position })
      .eq("id", target.id);

    setBusy(false);

    if (e1 || e2) {
      setError("We couldn't change the stage order.");
    }

    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-[1px]">
      <div className="h-full w-full max-w-[820px] overflow-y-auto border-l border-[#e5e7eb] bg-[#f7f8fa] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#e9ebef] bg-white/95 px-8 py-6">
          <div>
            <span className="rounded-full bg-[#f2f4f7] px-2.5 py-1 text-xs font-semibold text-[#667085]">
              After Onboarding
            </span>

            <h2 className="mt-3 text-2xl font-semibold text-[#172033]">
              Post-Training
            </h2>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e4e7ec] text-lg text-[#667085]"
          >
            ×
          </button>
        </div>

        <div className="space-y-6 p-8">
          <div className="rounded-[20px] border border-[#e5e7eb] bg-white p-6">
            <h3 className="font-semibold text-[#172033]">
              Post-training settings
            </h3>

            <div className="mt-5 space-y-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm"
              />

              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                rows={3}
                className="w-full resize-none rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm"
              />

              <textarea
                value={disclaimer}
                onChange={(e) =>
                  setDisclaimer(e.target.value)
                }
                placeholder="Disclaimer"
                rows={3}
                className="w-full resize-none rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm"
              />

              <div className="flex justify-end">
                <button
                  onClick={saveSettings}
                  disabled={busy}
                  className="rounded-xl bg-[#172033] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Save settings
                </button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 font-semibold text-[#172033]">
              Post-training stages
            </h3>

            <div className="space-y-3">
              {stages.map((stage, index) => (
                <div
                  key={stage.id}
                  className="rounded-[18px] border border-[#e5e7eb] bg-white p-5"
                >
                  <div className="flex justify-between gap-5">
                    <div>
                      <h4 className="text-sm font-semibold text-[#172033]">
                        {stage.title}
                      </h4>

                      {stage.description && (
                        <p className="mt-1.5 text-sm leading-5 text-[#667085]">
                          {stage.description}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() =>
                          moveStage(index, "up")
                        }
                        disabled={index === 0 || busy}
                        className="h-8 w-8 rounded-lg border border-[#e4e7ec] disabled:opacity-30"
                      >
                        ↑
                      </button>

                      <button
                        onClick={() =>
                          moveStage(index, "down")
                        }
                        disabled={
                          index === stages.length - 1 ||
                          busy
                        }
                        className="h-8 w-8 rounded-lg border border-[#e4e7ec] disabled:opacity-30"
                      >
                        ↓
                      </button>

                      <button
                        onClick={() => startEdit(stage)}
                        className="rounded-lg px-3 text-xs font-semibold text-[#475467]"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => deleteStage(stage)}
                        className="rounded-lg px-3 text-xs font-semibold text-[#b42318]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[20px] border border-[#e5e7eb] bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
              {editingId ? "Edit stage" : "Add stage"}
            </p>

            <div className="mt-5 space-y-4">
              <input
                value={stageTitle}
                onChange={(e) =>
                  setStageTitle(e.target.value)
                }
                placeholder="Stage title"
                className="w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm"
              />

              <textarea
                value={stageDescription}
                onChange={(e) =>
                  setStageDescription(e.target.value)
                }
                placeholder="Description"
                rows={3}
                className="w-full resize-none rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm"
              />

              {error && (
                <p className="text-sm text-[#b42318]">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                {editingId && (
                  <button
                    onClick={resetStage}
                    className="rounded-xl border border-[#d0d5dd] px-4 py-2.5 text-sm font-semibold text-[#344054]"
                  >
                    Cancel edit
                  </button>
                )}

                <button
                  onClick={saveStage}
                  disabled={busy}
                  className="rounded-xl bg-[#e84545] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {editingId
                    ? "Save stage"
                    : "Add stage"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}