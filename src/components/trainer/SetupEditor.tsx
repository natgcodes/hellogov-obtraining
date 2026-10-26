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

type SetupSection = {
  id: string;
  program_id: string;
  title: string;
  description: string | null;
  instructions: string | null;
};

type Props = {
  items: SetupItem[];
  programId: string;
  section: SetupSection;
  onClose: () => void;
};

export default function SetupEditor({
  items,
  programId,
  section,
  onClose,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  // ---------------------------------------------------------
  // SECTION SETTINGS
  // ---------------------------------------------------------

  const [sectionTitle, setSectionTitle] =
    useState(section.title);

  const [
    sectionDescription,
    setSectionDescription,
  ] = useState(section.description ?? "");

  const [
    sectionInstructions,
    setSectionInstructions,
  ] = useState(section.instructions ?? "");

  const [savingSection, setSavingSection] =
    useState(false);

  const [sectionSaved, setSectionSaved] =
    useState(false);

  // ---------------------------------------------------------
  // SETUP ITEM FORM
  // ---------------------------------------------------------

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");

  const [isRequired, setIsRequired] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [isReordering, setIsReordering] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

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

  // ---------------------------------------------------------
  // SAVE SECTION
  // ---------------------------------------------------------

  async function saveSection() {
    const cleanTitle =
      sectionTitle.trim();

    if (!cleanTitle) {
      setError(
        "Tool Setup title is required."
      );
      return;
    }

    setSavingSection(true);
    setSectionSaved(false);
    setError(null);

    const { error: sectionError } =
      await supabase
        .from("setup_sections")
        .upsert(
          {
            program_id: programId,
            title: cleanTitle,
            description:
              sectionDescription.trim() ||
              null,
            instructions:
              sectionInstructions.trim() ||
              null,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict: "program_id",
          }
        );

    if (sectionError) {
      console.error(
        "Unable to save Tool Setup:",
        sectionError
      );

      setError(
        "We couldn't save the Tool Setup settings."
      );

      setSavingSection(false);
      return;
    }

    setSavingSection(false);
    setSectionSaved(true);

    router.refresh();

    window.setTimeout(() => {
      setSectionSaved(false);
    }, 2500);
  }

  // ---------------------------------------------------------
  // SAVE ITEM
  // ---------------------------------------------------------

  async function saveItem() {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setError("Item title is required.");
      return;
    }

    setIsSaving(true);
    setError(null);

    if (editingId) {
      const { error: updateError } =
        await supabase
          .from("setup_items")
          .update({
            title: cleanTitle,
            description:
              description.trim() || null,
            is_required: isRequired,
          })
          .eq("id", editingId)
          .eq("program_id", programId);

      if (updateError) {
        setError(
          "We couldn't update this setup item."
        );
        setIsSaving(false);
        return;
      }
    } else {
      const { error: insertError } =
        await supabase
          .from("setup_items")
          .insert({
            program_id: programId,
            title: cleanTitle,
            description:
              description.trim() || null,
            is_required: isRequired,
            position: items.length + 1,
          });

      if (insertError) {
        setError(
          "We couldn't create this setup item."
        );
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(false);
    resetForm();
    router.refresh();
  }

  // ---------------------------------------------------------
  // DELETE ITEM
  // ---------------------------------------------------------

  async function deleteItem(
    item: SetupItem
  ) {
    const confirmed = window.confirm(
      `Delete "${item.title}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    const { error: deleteError } =
      await supabase
        .from("setup_items")
        .delete()
        .eq("id", item.id)
        .eq("program_id", programId);

    if (deleteError) {
      setError(
        "We couldn't delete this setup item."
      );
      return;
    }

    if (editingId === item.id) {
      resetForm();
    }

    router.refresh();
  }

  // ---------------------------------------------------------
  // REORDER
  // ---------------------------------------------------------

  async function moveItem(
    index: number,
    direction: "up" | "down"
  ) {
    if (isReordering) {
      return;
    }

    const targetIndex =
      direction === "up"
        ? index - 1
        : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= items.length
    ) {
      return;
    }

    const current = items[index];
    const target = items[targetIndex];

    setIsReordering(true);
    setError(null);

    const tempCurrent = -200001;
    const tempTarget = -200002;

    const { error: e1 } =
      await supabase
        .from("setup_items")
        .update({
          position: tempCurrent,
        })
        .eq("id", current.id)
        .eq("program_id", programId);

    if (e1) {
      setError(
        "We couldn't change the item order."
      );
      setIsReordering(false);
      return;
    }

    const { error: e2 } =
      await supabase
        .from("setup_items")
        .update({
          position: tempTarget,
        })
        .eq("id", target.id)
        .eq("program_id", programId);

    if (e2) {
      await supabase
        .from("setup_items")
        .update({
          position: current.position,
        })
        .eq("id", current.id)
        .eq("program_id", programId);

      setError(
        "We couldn't change the item order."
      );
      setIsReordering(false);
      return;
    }

    const { error: e3 } =
      await supabase
        .from("setup_items")
        .update({
          position: target.position,
        })
        .eq("id", current.id)
        .eq("program_id", programId);

    const { error: e4 } =
      await supabase
        .from("setup_items")
        .update({
          position: current.position,
        })
        .eq("id", target.id)
        .eq("program_id", programId);

    if (e3 || e4) {
      setError(
        "We couldn't change the item order."
      );
    }

    setIsReordering(false);
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/20 backdrop-blur-[2px]">
      <div className="flex h-full w-full max-w-[780px] flex-col border-l border-[var(--border)] bg-[#F7F9FA] shadow-2xl">
        {/* ===================================================
            HEADER
        =================================================== */}

        <header className="shrink-0 border-b border-[var(--border-soft)] bg-white px-5 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <span className="inline-flex rounded-full bg-[#EAF8FA] px-2.5 py-1 text-[10px] font-semibold text-[#07879B]">
                Before Day 1
              </span>

              <h2 className="mt-3 text-[22px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                {sectionTitle || "Tool Setup"}
              </h2>

              {sectionDescription && (
                <p className="mt-1.5 max-w-xl text-[13px] leading-5 text-[var(--text-secondary)]">
                  {sectionDescription}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Tool Setup"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[18px] text-[var(--text-muted)] transition hover:bg-slate-50 hover:text-[var(--text-primary)]"
            >
              ×
            </button>
          </div>
        </header>

        {/* ===================================================
            SCROLL AREA
        =================================================== */}

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-5 p-5 sm:p-7">
            {/* ===============================================
                SECTION SETTINGS
            =============================================== */}

            <section className="overflow-hidden rounded-[18px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
              <div className="border-b border-[var(--border-soft)] px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#07879B]">
                  Section settings
                </p>

                <h3 className="mt-1.5 text-[15px] font-semibold text-[var(--text-primary)]">
                  Tool Setup introduction
                </h3>

                <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">
                  Customize what trainees see
                  before completing their setup
                  checklist.
                </p>
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <label
                    htmlFor="setup-section-title"
                    className="mb-1.5 block text-[12px] font-semibold text-[var(--text-primary)]"
                  >
                    Title
                  </label>

                  <input
                    id="setup-section-title"
                    value={sectionTitle}
                    onChange={(event) => {
                      setSectionTitle(
                        event.target.value
                      );
                      setSectionSaved(false);
                      setError(null);
                    }}
                    placeholder="Tool Setup"
                    className="h-11 w-full rounded-[11px] border border-[var(--border)] bg-white px-3.5 text-[13px] text-[var(--text-primary)] outline-none transition placeholder:text-slate-400 focus:border-[#08A9C1] focus:ring-2 focus:ring-[#08A9C1]/10"
                  />
                </div>

                <div>
                  <label
                    htmlFor="setup-section-description"
                    className="mb-1.5 block text-[12px] font-semibold text-[var(--text-primary)]"
                  >
                    Description
                  </label>

                  <textarea
                    id="setup-section-description"
                    value={sectionDescription}
                    onChange={(event) => {
                      setSectionDescription(
                        event.target.value
                      );
                      setSectionSaved(false);
                      setError(null);
                    }}
                    placeholder="Briefly explain the purpose of this section."
                    rows={3}
                    className="w-full resize-none rounded-[11px] border border-[var(--border)] bg-white px-3.5 py-3 text-[13px] leading-5 text-[var(--text-primary)] outline-none transition placeholder:text-slate-400 focus:border-[#08A9C1] focus:ring-2 focus:ring-[#08A9C1]/10"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <label
                      htmlFor="setup-section-instructions"
                      className="block text-[12px] font-semibold text-[var(--text-primary)]"
                    >
                      Instructions
                    </label>

                    <span className="text-[10px] font-medium text-[var(--text-muted)]">
                      Optional
                    </span>
                  </div>

                  <textarea
                    id="setup-section-instructions"
                    value={sectionInstructions}
                    onChange={(event) => {
                      setSectionInstructions(
                        event.target.value
                      );
                      setSectionSaved(false);
                      setError(null);
                    }}
                    placeholder="Add any instructions trainees should read before completing the setup checklist."
                    rows={4}
                    className="w-full resize-none rounded-[11px] border border-[var(--border)] bg-white px-3.5 py-3 text-[13px] leading-5 text-[var(--text-primary)] outline-none transition placeholder:text-slate-400 focus:border-[#08A9C1] focus:ring-2 focus:ring-[#08A9C1]/10"
                  />

                  <p className="mt-1.5 text-[11px] leading-4 text-[var(--text-muted)]">
                    Instructions can be shown as
                    an information box in the
                    trainee Learning Center.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div>
                    {sectionSaved && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Changes saved
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={saveSection}
                    disabled={savingSection}
                    className="inline-flex min-h-10 items-center justify-center rounded-[10px] bg-[#07879B] px-4 text-[12px] font-semibold text-white transition hover:bg-[#066F80] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingSection
                      ? "Saving..."
                      : "Save section"}
                  </button>
                </div>
              </div>
            </section>

            {/* ===============================================
                SETUP ITEMS
            =============================================== */}

            <section>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-1">
                <div>
                  <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
                    Setup checklist
                  </h3>

                  <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                    {items.length}{" "}
                    {items.length === 1
                      ? "item"
                      : "items"}{" "}
                    configured
                  </p>
                </div>

                {isReordering && (
                  <span className="text-[11px] font-medium text-[#07879B]">
                    Updating order...
                  </span>
                )}
              </div>

              {items.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-[var(--border)] bg-white px-5 py-8 text-center">
                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                    No setup items yet
                  </p>

                  <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                    Add the first requirement
                    below.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className={`rounded-[16px] border bg-white p-4 shadow-[var(--shadow-xs)] transition ${
                        editingId === item.id
                          ? "border-[#08A9C1]/50 ring-2 ring-[#08A9C1]/10"
                          : "border-[var(--border)]"
                      }`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">
                              {item.title}
                            </h4>

                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                                item.is_required
                                  ? "bg-[#EAF8FA] text-[#07879B]"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {item.is_required
                                ? "Required"
                                : "Optional"}
                            </span>
                          </div>

                          {item.description && (
                            <p className="mt-1 max-w-xl text-[11px] leading-5 text-[var(--text-secondary)]">
                              {item.description}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              moveItem(
                                index,
                                "up"
                              )
                            }
                            disabled={
                              index === 0 ||
                              isReordering
                            }
                            aria-label={`Move ${item.title} up`}
                            className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-[var(--border)] bg-white text-[var(--text-secondary)] transition hover:bg-slate-50 hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ↑
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              moveItem(
                                index,
                                "down"
                              )
                            }
                            disabled={
                              index ===
                                items.length -
                                  1 ||
                              isReordering
                            }
                            aria-label={`Move ${item.title} down`}
                            className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-[var(--border)] bg-white text-[var(--text-secondary)] transition hover:bg-slate-50 hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ↓
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              editItem(item)
                            }
                            className="rounded-[9px] px-3 py-2 text-[11px] font-semibold text-[#07879B] transition hover:bg-[#EAF8FA]"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteItem(item)
                            }
                            className="rounded-[9px] px-3 py-2 text-[11px] font-semibold text-red-600 transition hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ===============================================
                ADD / EDIT ITEM
            =============================================== */}

            <section className="overflow-hidden rounded-[18px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
              <div className="border-b border-[var(--border-soft)] px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#07879B]">
                  {editingId
                    ? "Editing requirement"
                    : "New requirement"}
                </p>

                <h3 className="mt-1.5 text-[14px] font-semibold text-[var(--text-primary)]">
                  {editingId
                    ? "Update setup item"
                    : "Add setup item"}
                </h3>
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <label
                    htmlFor="setup-item-title"
                    className="mb-1.5 block text-[12px] font-semibold text-[var(--text-primary)]"
                  >
                    Item title
                  </label>

                  <input
                    id="setup-item-title"
                    value={title}
                    onChange={(event) => {
                      setTitle(
                        event.target.value
                      );
                      setError(null);
                    }}
                    placeholder="e.g. HelloGov Admin Account"
                    className="h-11 w-full rounded-[11px] border border-[var(--border)] bg-white px-3.5 text-[13px] text-[var(--text-primary)] outline-none transition placeholder:text-slate-400 focus:border-[#08A9C1] focus:ring-2 focus:ring-[#08A9C1]/10"
                  />
                </div>

                <div>
                  <label
                    htmlFor="setup-item-description"
                    className="mb-1.5 block text-[12px] font-semibold text-[var(--text-primary)]"
                  >
                    Description
                  </label>

                  <textarea
                    id="setup-item-description"
                    value={description}
                    onChange={(event) => {
                      setDescription(
                        event.target.value
                      );
                      setError(null);
                    }}
                    placeholder="Explain what the trainee needs to confirm or complete."
                    rows={3}
                    className="w-full resize-none rounded-[11px] border border-[var(--border)] bg-white px-3.5 py-3 text-[13px] leading-5 text-[var(--text-primary)] outline-none transition placeholder:text-slate-400 focus:border-[#08A9C1] focus:ring-2 focus:ring-[#08A9C1]/10"
                  />
                </div>

                <label className="flex w-fit cursor-pointer items-center gap-2.5 text-[12px] font-medium text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={isRequired}
                    onChange={(event) =>
                      setIsRequired(
                        event.target.checked
                      )
                    }
                    className="h-4 w-4 accent-[#07879B]"
                  />

                  Required
                </label>

                {error && (
                  <div className="rounded-[10px] border border-red-200 bg-red-50 px-3.5 py-3 text-[11px] font-medium text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-soft)] pt-4">
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="inline-flex min-h-10 items-center justify-center rounded-[10px] border border-[var(--border)] bg-white px-4 text-[12px] font-semibold text-[var(--text-secondary)] transition hover:bg-slate-50"
                    >
                      Cancel edit
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={saveItem}
                    disabled={isSaving}
                    className="inline-flex min-h-10 items-center justify-center rounded-[10px] bg-[#07879B] px-4 text-[12px] font-semibold text-white transition hover:bg-[#066F80] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving
                      ? "Saving..."
                      : editingId
                        ? "Save changes"
                        : "Add item"}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}