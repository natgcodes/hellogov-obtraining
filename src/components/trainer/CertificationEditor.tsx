"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Component = {
  id: string;
  title: string;
  description: string | null;
  component_type: string;
  passing_score: number | null;
  position: number;
};

type Certification = {
  id: string;
  program_id: string;
  title: string;
  description: string | null;
  passing_score: number | null;
  certification_components: Component[];
};

type Props = {
  certification: Certification;
  onClose: () => void;
};

export default function CertificationEditor({
  certification,
  onClose,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState(certification.title);
  const [description, setDescription] = useState(
    certification.description ?? ""
  );
  const [passingScore, setPassingScore] = useState(
    certification.passing_score?.toString() ?? ""
  );

  const [editingId, setEditingId] = useState<string | null>(
    null
  );
  const [componentTitle, setComponentTitle] = useState("");
  const [componentDescription, setComponentDescription] =
    useState("");
  const [componentType, setComponentType] =
    useState("assessment");
  const [componentScore, setComponentScore] = useState("80");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const components =
    certification.certification_components ?? [];

  function resetComponent() {
    setEditingId(null);
    setComponentTitle("");
    setComponentDescription("");
    setComponentType("assessment");
    setComponentScore("80");
  }

  function startEdit(component: Component) {
    setEditingId(component.id);
    setComponentTitle(component.title);
    setComponentDescription(component.description ?? "");
    setComponentType(component.component_type);
    setComponentScore(
      component.passing_score?.toString() ?? ""
    );
  }

  function parseScore(value: string) {
    if (!value.trim()) return null;

    const score = Number(value);

    if (!Number.isFinite(score) || score < 0 || score > 100) {
      return undefined;
    }

    return score;
  }

  async function saveSettings() {
    const score = parseScore(passingScore);

    if (!title.trim()) {
      setError("Certification title is required.");
      return;
    }

    if (score === undefined) {
      setError("Passing score must be between 0 and 100.");
      return;
    }

    setBusy(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("certifications")
      .update({
        title: title.trim(),
        description: description.trim() || null,
        passing_score: score,
      })
      .eq("id", certification.id);

    setBusy(false);

    if (updateError) {
      setError("We couldn't update the certification.");
      return;
    }

    router.refresh();
  }

  async function saveComponent() {
    const score = parseScore(componentScore);

    if (!componentTitle.trim()) {
      setError("Component title is required.");
      return;
    }

    if (score === undefined) {
      setError("Passing score must be between 0 and 100.");
      return;
    }

    setBusy(true);
    setError(null);

    if (editingId) {
      const { error: updateError } = await supabase
        .from("certification_components")
        .update({
          title: componentTitle.trim(),
          description:
            componentDescription.trim() || null,
          component_type: componentType,
          passing_score: score,
        })
        .eq("id", editingId);

      if (updateError) {
        setError("We couldn't update this component.");
        setBusy(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from("certification_components")
        .insert({
          certification_id: certification.id,
          title: componentTitle.trim(),
          description:
            componentDescription.trim() || null,
          component_type: componentType,
          passing_score: score,
          position: components.length + 1,
        });

      if (insertError) {
        setError("We couldn't create this component.");
        setBusy(false);
        return;
      }
    }

    setBusy(false);
    resetComponent();
    router.refresh();
  }

  async function deleteComponent(component: Component) {
    if (
      !window.confirm(
        `Delete "${component.title}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    const { error: deleteError } = await supabase
      .from("certification_components")
      .delete()
      .eq("id", component.id);

    if (deleteError) {
      setError("We couldn't delete this component.");
      return;
    }

    router.refresh();
  }

  async function moveComponent(
    index: number,
    direction: "up" | "down"
  ) {
    if (busy) return;

    const targetIndex =
      direction === "up" ? index - 1 : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= components.length
    ) {
      return;
    }

    const current = components[index];
    const target = components[targetIndex];

    setBusy(true);
    setError(null);

    await supabase
      .from("certification_components")
      .update({ position: -300001 })
      .eq("id", current.id);

    await supabase
      .from("certification_components")
      .update({ position: -300002 })
      .eq("id", target.id);

    const { error: e1 } = await supabase
      .from("certification_components")
      .update({ position: target.position })
      .eq("id", current.id);

    const { error: e2 } = await supabase
      .from("certification_components")
      .update({ position: current.position })
      .eq("id", target.id);

    setBusy(false);

    if (e1 || e2) {
      setError("We couldn't change the component order.");
    }

    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-[1px]">
      <div className="h-full w-full max-w-[820px] overflow-y-auto border-l border-[#e5e7eb] bg-[#f7f8fa] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#e9ebef] bg-white/95 px-8 py-6">
          <div>
            <span className="rounded-full bg-[#f3f0ff] px-2.5 py-1 text-xs font-semibold text-[#6847df]">
              Final Assessment
            </span>

            <h2 className="mt-3 text-2xl font-semibold text-[#172033]">
              Certification
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
              Certification settings
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

              <div>
                <label className="text-xs font-semibold text-[#667085]">
                  Overall passing score
                </label>

                <input
                  type="number"
                  min="0"
                  max="100"
                  value={passingScore}
                  onChange={(e) =>
                    setPassingScore(e.target.value)
                  }
                  className="mt-1.5 w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm"
                />
              </div>

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
              Certification components
            </h3>

            <div className="space-y-3">
              {components.map((component, index) => (
                <div
                  key={component.id}
                  className="rounded-[18px] border border-[#e5e7eb] bg-white p-5"
                >
                  <div className="flex justify-between gap-5">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <h4 className="text-sm font-semibold text-[#172033]">
                          {component.title}
                        </h4>

                        <span className="rounded-full bg-[#f3f0ff] px-2 py-0.5 text-[10px] font-semibold text-[#6847df]">
                          {component.component_type}
                        </span>
                      </div>

                      {component.description && (
                        <p className="mt-1.5 text-sm leading-5 text-[#667085]">
                          {component.description}
                        </p>
                      )}

                      {component.passing_score !== null && (
                        <p className="mt-2 text-xs text-[#98a2b3]">
                          Passing score:{" "}
                          {component.passing_score}%
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() =>
                          moveComponent(index, "up")
                        }
                        disabled={index === 0 || busy}
                        className="h-8 w-8 rounded-lg border border-[#e4e7ec] disabled:opacity-30"
                      >
                        ↑
                      </button>

                      <button
                        onClick={() =>
                          moveComponent(index, "down")
                        }
                        disabled={
                          index === components.length - 1 ||
                          busy
                        }
                        className="h-8 w-8 rounded-lg border border-[#e4e7ec] disabled:opacity-30"
                      >
                        ↓
                      </button>

                      <button
                        onClick={() => startEdit(component)}
                        className="rounded-lg px-3 text-xs font-semibold text-[#475467]"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          deleteComponent(component)
                        }
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
              {editingId
                ? "Edit component"
                : "Add component"}
            </p>

            <div className="mt-5 space-y-4">
              <input
                value={componentTitle}
                onChange={(e) =>
                  setComponentTitle(e.target.value)
                }
                placeholder="Component title"
                className="w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm"
              />

              <textarea
                value={componentDescription}
                onChange={(e) =>
                  setComponentDescription(e.target.value)
                }
                placeholder="Description"
                rows={3}
                className="w-full resize-none rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <select
                  value={componentType}
                  onChange={(e) =>
                    setComponentType(e.target.value)
                  }
                  className="rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 text-sm"
                >
                  <option value="assessment">
                    Assessment
                  </option>
                  <option value="knowledge">
                    Knowledge
                  </option>
                  <option value="practical">
                    Practical
                  </option>
                  <option value="mock_call">
                    Mock Call
                  </option>
                  <option value="trainer_review">
                    Trainer Review
                  </option>
                  <option value="other">Other</option>
                </select>

                <input
                  type="number"
                  min="0"
                  max="100"
                  value={componentScore}
                  onChange={(e) =>
                    setComponentScore(e.target.value)
                  }
                  placeholder="Passing score"
                  className="rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm"
                />
              </div>

              {error && (
                <p className="text-sm text-[#b42318]">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                {editingId && (
                  <button
                    onClick={resetComponent}
                    className="rounded-xl border border-[#d0d5dd] px-4 py-2.5 text-sm font-semibold text-[#344054]"
                  >
                    Cancel edit
                  </button>
                )}

                <button
                  onClick={saveComponent}
                  disabled={busy}
                  className="rounded-xl bg-[#e84545] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {editingId
                    ? "Save component"
                    : "Add component"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}