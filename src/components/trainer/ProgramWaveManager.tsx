"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Program = {
  id: string;
  title: string;
  description: string | null;
  status: string;
};

type Props = {
  programs: Program[];
  selectedProgramId: string;
};

const ORIGINAL_WAVE_ID = "5f5a6ef1-3133-45f6-b421-0dc09ea4a6a0";

export default function ProgramWaveManager({
  programs,
  selectedProgramId,
}: Props) {
  const router = useRouter();

  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const [duplicateMode, setDuplicateMode] = useState<"new" | "existing">(
    "new"
  );
  const [duplicateTitle, setDuplicateTitle] = useState("");
  const [duplicateTargetId, setDuplicateTargetId] = useState("");

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const selectedProgram = programs.find(
    (program) => program.id === selectedProgramId
  );

  const [editTitle, setEditTitle] = useState(
    selectedProgram?.title ?? ""
  );

  const [editDescription, setEditDescription] = useState(
    selectedProgram?.description ?? ""
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [error, setError] = useState<string | null>(null);

  const isBusy = isSaving;

  const canDeleteSelectedWave =
    !!selectedProgram &&
    selectedProgram.id !== ORIGINAL_WAVE_ID &&
    selectedProgram.status === "draft";

  const isDeleteConfirmationValid =
    !!selectedProgram &&
    deleteConfirmation === selectedProgram.title;

  // ============================================================
  // EDIT WAVE
  // ============================================================

  function startEditing() {
    if (!selectedProgram || isBusy) {
      return;
    }

    setEditTitle(selectedProgram.title);
    setEditDescription(selectedProgram.description ?? "");

    setIsCreating(false);
    setIsDuplicating(false);
    setIsEditing(true);

    setError(null);
  }

  function cancelEditing() {
    if (isBusy) {
      return;
    }

    setIsEditing(false);
    setError(null);
  }

  async function saveProgramChanges() {
    const trimmedTitle = editTitle.trim();

    if (!trimmedTitle || isBusy || !selectedProgram) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from("programs")
        .update({
          title: trimmedTitle,
          description: editDescription.trim() || null,
        })
        .eq("id", selectedProgramId);

      if (updateError) {
        throw updateError;
      }

      setIsEditing(false);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update the wave."
      );
    } finally {
      setIsSaving(false);
    }
  }

  // ============================================================
  // NAVIGATION
  // ============================================================

  function openProgram(programId: string) {
    if (isBusy) {
      return;
    }

    setError(null);

    router.push(
      `/trainer/program?programId=${encodeURIComponent(programId)}`
    );
  }

  // ============================================================
  // CREATE EMPTY WAVE
  // ============================================================

  async function createProgram() {
    const trimmedTitle = title.trim();

    if (!trimmedTitle || isBusy) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("You must be signed in to create a wave.");
      }

      const { data, error: insertError } = await supabase
        .from("programs")
        .insert({
          title: trimmedTitle,
          description: description.trim() || null,
          status: "draft",
          created_by: user.id,
        })
        .select("id")
        .single();

      if (insertError) {
        throw insertError;
      }

      if (!data) {
        throw new Error("The new wave could not be created.");
      }

      setTitle("");
      setDescription("");
      setIsCreating(false);

      router.push(
        `/trainer/program?programId=${encodeURIComponent(data.id)}`
      );

      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create the wave."
      );
    } finally {
      setIsSaving(false);
    }
  }

  // ============================================================
  // DUPLICATE WAVE
  // ============================================================

  function toggleDuplication() {
    if (!selectedProgram || isBusy) {
      return;
    }

    const shouldOpen = !isDuplicating;

    setIsDuplicating(shouldOpen);
    setIsCreating(false);
    setIsEditing(false);

    setDuplicateMode("new");
    setDuplicateTitle(`${selectedProgram.title} (Copy)`);
    setDuplicateTargetId("");

    setError(null);
  }

  async function duplicateProgram() {
    if (!selectedProgram || isBusy) {
      return;
    }

    const newTitle = duplicateTitle.trim();

    if (duplicateMode === "new" && !newTitle) {
      setError("Please enter a name for the new wave.");
      return;
    }

    if (duplicateMode === "existing" && !duplicateTargetId) {
      setError("Please select a destination wave.");
      return;
    }

    if (
      duplicateMode === "existing" &&
      duplicateTargetId === selectedProgramId
    ) {
      setError("Source and destination cannot be the same wave.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data, error: duplicateError } = await supabase.rpc(
        "duplicate_training_wave",
        {
          p_source_program_id: selectedProgramId,
          p_target_program_id:
            duplicateMode === "existing" ? duplicateTargetId : null,
          p_new_title: duplicateMode === "new" ? newTitle : null,
        }
      );

      if (duplicateError) {
        throw duplicateError;
      }

      if (!data || typeof data !== "string") {
        throw new Error("The duplicated wave could not be created.");
      }

      setIsDuplicating(false);
      setDuplicateTargetId("");
      setDuplicateTitle("");

      router.push(
        `/trainer/program?programId=${encodeURIComponent(data)}`
      );

      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to duplicate the wave."
      );
    } finally {
      setIsSaving(false);
    }
  }

  // ============================================================
  // DELETE WAVE — MODAL
  // ============================================================

  function openDeleteModal() {
    if (!canDeleteSelectedWave || isBusy) {
      return;
    }

    setIsCreating(false);
    setIsEditing(false);
    setIsDuplicating(false);

    setDeleteConfirmation("");
    setDeleteError(null);
    setError(null);

    setIsDeleteModalOpen(true);
  }

  function closeDeleteModal() {
    if (isBusy) {
      return;
    }

    setIsDeleteModalOpen(false);
    setDeleteConfirmation("");
    setDeleteError(null);
  }

  // ============================================================
  // DELETE WAVE — SUPABASE
  // ============================================================

  async function deleteProgram() {
    if (
      !selectedProgram ||
      !canDeleteSelectedWave ||
      !isDeleteConfirmationValid ||
      isBusy
    ) {
      return;
    }

    const programIdToDelete = selectedProgram.id;
    const confirmationTitle = selectedProgram.title;

    setIsSaving(true);
    setDeleteError(null);

    try {
      const supabase = createClient();

      const { error: deletionError } = await supabase.rpc(
        "delete_training_wave",
        {
          p_program_id: programIdToDelete,
          p_confirmation_title: confirmationTitle,
        }
      );

      if (deletionError) {
        throw deletionError;
      }

      setIsDeleteModalOpen(false);
      setDeleteConfirmation("");
      setDeleteError(null);

      router.push(
        `/trainer/program?programId=${encodeURIComponent(
          ORIGINAL_WAVE_ID
        )}`
      );

      router.refresh();
    } catch (caughtError) {
      setDeleteError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete the training wave."
      );
    } finally {
      setIsSaving(false);
    }
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <section className="rounded-[18px] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-xs)]">
      {/* HEADER */}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--teal)]">
            Training Programs
          </p>

          <h2 className="mt-1 text-[17px] font-semibold text-[var(--text-primary)]">
            Manage Training Waves
          </h2>

          <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">
            Switch between onboarding waves, create a new one, duplicate
            existing training content, or manage draft waves.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* EDIT */}

          <button
            type="button"
            onClick={startEditing}
            disabled={!selectedProgram || isBusy}
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-[12px] font-semibold text-[var(--text-primary)] transition hover:bg-slate-50 disabled:opacity-50"
          >
            Edit Wave
          </button>

          {/* DUPLICATE */}

          <button
            type="button"
            onClick={toggleDuplication}
            disabled={!selectedProgram || isBusy}
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-[12px] font-semibold text-[var(--text-primary)] transition hover:bg-slate-50 disabled:opacity-50"
          >
            {isDuplicating ? "Cancel Duplication" : "Duplicate Wave"}
          </button>

          {/* DELETE */}

          <button
            type="button"
            onClick={openDeleteModal}
            disabled={!canDeleteSelectedWave || isBusy}
            title={
              selectedProgram?.id === ORIGINAL_WAVE_ID
                ? "The original training wave cannot be deleted."
                : selectedProgram?.status !== "draft"
                  ? "Only draft waves can be deleted."
                  : "Delete this training wave."
            }
            className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-[12px] font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete Wave
          </button>

          {/* CREATE */}

          <button
            type="button"
            onClick={() => {
              if (isBusy) {
                return;
              }

              setIsDuplicating(false);
              setIsCreating((current) => !current);
              setIsEditing(false);
              setError(null);
            }}
            disabled={isBusy}
            className="rounded-xl bg-[var(--teal)] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {isCreating ? "Cancel" : "+ Create New Wave"}
          </button>
        </div>
      </div>

      {/* WAVE SELECTOR */}

      <div className="mt-5">
        <label
          htmlFor="training-wave"
          className="mb-2 block text-[12px] font-semibold text-[var(--text-primary)]"
        >
          Selected wave
        </label>

        <select
          id="training-wave"
          value={selectedProgramId}
          onChange={(event) => openProgram(event.target.value)}
          disabled={isBusy || isDeleteModalOpen}
          className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-3 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--teal)] disabled:opacity-50"
        >
          {programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.title} — {program.status}
            </option>
          ))}
        </select>
      </div>

      {/* ======================================================
          DUPLICATE WAVE FORM
      ====================================================== */}

      {isDuplicating && selectedProgram && (
        <div className="mt-5 space-y-4 border-t border-[var(--border)] pt-5">
          <div>
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
              Duplicate Training Wave
            </h3>

            <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
              Source: {selectedProgram.title}
            </p>
          </div>

          {/* DUPLICATION MODES */}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setDuplicateMode("new");
                setError(null);
              }}
              disabled={isBusy}
              className={`rounded-xl border p-4 text-left transition disabled:opacity-50 ${
                duplicateMode === "new"
                  ? "border-[var(--teal)] bg-teal-50"
                  : "border-[var(--border)] bg-white hover:bg-slate-50"
              }`}
            >
              <p className="text-[13px] font-semibold">
                A — Duplicate as New Wave
              </p>

              <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                Create a new independent wave with the same training
                content.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setDuplicateMode("existing");
                setError(null);
              }}
              disabled={isBusy}
              className={`rounded-xl border p-4 text-left transition disabled:opacity-50 ${
                duplicateMode === "existing"
                  ? "border-[var(--teal)] bg-teal-50"
                  : "border-[var(--border)] bg-white hover:bg-slate-50"
              }`}
            >
              <p className="text-[13px] font-semibold">
                B — Copy to Existing Wave
              </p>

              <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                Copy training content into an existing empty draft wave.
              </p>
            </button>
          </div>

          {/* OPTION A / B */}

          {duplicateMode === "new" ? (
            <div>
              <label
                htmlFor="duplicate-wave-title"
                className="mb-2 block text-[12px] font-semibold text-[var(--text-primary)]"
              >
                New wave name
              </label>

              <input
                id="duplicate-wave-title"
                value={duplicateTitle}
                onChange={(event) => {
                  setDuplicateTitle(event.target.value);
                  setError(null);
                }}
                disabled={isBusy}
                maxLength={150}
                className="w-full rounded-xl border border-[var(--border)] px-3 py-3 text-[13px] outline-none focus:border-[var(--teal)] disabled:opacity-50"
              />
            </div>
          ) : (
            <div>
              <label
                htmlFor="duplicate-wave-target"
                className="mb-2 block text-[12px] font-semibold text-[var(--text-primary)]"
              >
                Destination wave
              </label>

              <select
                id="duplicate-wave-target"
                value={duplicateTargetId}
                onChange={(event) => {
                  setDuplicateTargetId(event.target.value);
                  setError(null);
                }}
                disabled={isBusy}
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-3 text-[13px] outline-none focus:border-[var(--teal)] disabled:opacity-50"
              >
                <option value="">Select a draft wave...</option>

                {programs
                  .filter(
                    (program) =>
                      program.id !== selectedProgramId &&
                      program.status === "draft"
                  )
                  .map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.title}
                    </option>
                  ))}
              </select>

              <p className="mt-2 text-[11px] text-[var(--text-secondary)]">
                The destination must be empty and have no learner
                enrollments. Supabase will verify this before copying.
              </p>
            </div>
          )}

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900">
            Duplication copies training content only. Learners, quiz
            attempts, assessment results, and progress will not be
            copied. The destination will remain in draft status.
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() => void duplicateProgram()}
            disabled={
              isBusy ||
              (duplicateMode === "new" && !duplicateTitle.trim()) ||
              (duplicateMode === "existing" && !duplicateTargetId)
            }
            className="rounded-xl bg-[var(--teal)] px-5 py-3 text-[12px] font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBusy ? "Duplicating wave..." : "Duplicate Wave"}
          </button>
        </div>
      )}

      {/* ======================================================
          EDIT WAVE FORM
      ====================================================== */}

      {isEditing && (
        <form
          className="mt-5 space-y-4 border-t border-[var(--border)] pt-5"
          onSubmit={(event) => {
            event.preventDefault();
            void saveProgramChanges();
          }}
        >
          <div>
            <label
              htmlFor="edit-wave-title"
              className="mb-2 block text-[12px] font-semibold text-[var(--text-primary)]"
            >
              Wave name
            </label>

            <input
              id="edit-wave-title"
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              required
              disabled={isBusy}
              maxLength={150}
              className="w-full rounded-xl border border-[var(--border)] px-3 py-3 text-[13px] outline-none focus:border-[var(--teal)] disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="edit-wave-description"
              className="mb-2 block text-[12px] font-semibold text-[var(--text-primary)]"
            >
              Description
            </label>

            <textarea
              id="edit-wave-description"
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              rows={3}
              disabled={isBusy}
              className="w-full resize-y rounded-xl border border-[var(--border)] px-3 py-3 text-[13px] outline-none focus:border-[var(--teal)] disabled:opacity-50"
            />
          </div>

          {error && (
            <p role="alert" className="text-[12px] text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isBusy || !editTitle.trim()}
              className="rounded-xl bg-[var(--teal)] px-5 py-3 text-[12px] font-semibold text-white disabled:opacity-50"
            >
              {isBusy ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              onClick={cancelEditing}
              disabled={isBusy}
              className="rounded-xl border border-[var(--border)] px-5 py-3 text-[12px] font-semibold text-[var(--text-primary)] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ======================================================
          CREATE NEW WAVE FORM
      ====================================================== */}

      {isCreating && (
        <form
          className="mt-5 space-y-4 border-t border-[var(--border)] pt-5"
          onSubmit={(event) => {
            event.preventDefault();
            void createProgram();
          }}
        >
          <div>
            <label
              htmlFor="new-wave-title"
              className="mb-2 block text-[12px] font-semibold text-[var(--text-primary)]"
            >
              Wave name
            </label>

            <input
              id="new-wave-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. HelloGov Onboarding — Wave 2"
              required
              disabled={isBusy}
              maxLength={150}
              className="w-full rounded-xl border border-[var(--border)] px-3 py-3 text-[13px] outline-none focus:border-[var(--teal)] disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="new-wave-description"
              className="mb-2 block text-[12px] font-semibold text-[var(--text-primary)]"
            >
              Description (optional)
            </label>

            <textarea
              id="new-wave-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe this onboarding wave..."
              rows={3}
              disabled={isBusy}
              className="w-full resize-y rounded-xl border border-[var(--border)] px-3 py-3 text-[13px] outline-none focus:border-[var(--teal)] disabled:opacity-50"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isBusy || !title.trim()}
            className="rounded-xl bg-[var(--teal)] px-5 py-3 text-[12px] font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBusy ? "Creating wave..." : "Create Wave"}
          </button>
        </form>
      )}

      {/* ======================================================
          DELETE WAVE MODAL
      ====================================================== */}

      {isDeleteModalOpen && selectedProgram && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-wave-title"
            aria-describedby="delete-wave-description"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl font-bold text-red-600">
              !
            </div>

            <h2
              id="delete-wave-title"
              className="text-lg font-bold text-slate-900"
            >
              Delete Training Wave?
            </h2>

            <p
              id="delete-wave-description"
              className="mt-3 text-sm leading-6 text-slate-600"
            >
              You are about to permanently delete{" "}
              <strong className="text-slate-900">
                {selectedProgram.title}
              </strong>
              .
            </p>

            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">
                This action cannot be undone.
              </p>

              <p className="mt-1 text-xs leading-5 text-red-700">
                All training content associated with this wave may be
                permanently removed. Other waves will remain unaffected.
              </p>
            </div>

            <label
              htmlFor="delete-wave-confirmation"
              className="mt-5 block text-sm font-medium text-slate-700"
            >
              To confirm, type the exact wave name:
            </label>

            <p className="mt-2 break-words rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900">
              {selectedProgram.title}
            </p>

            <input
              id="delete-wave-confirmation"
              type="text"
              autoComplete="off"
              autoFocus
              value={deleteConfirmation}
              disabled={isBusy}
              onChange={(event) => {
                setDeleteConfirmation(event.target.value);
                setDeleteError(null);
              }}
              className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-red-500 disabled:opacity-50"
              placeholder="Enter wave name"
            />

            {deleteError && (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
              >
                {deleteError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={isBusy}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void deleteProgram()}
                disabled={
                  isBusy ||
                  !canDeleteSelectedWave ||
                  !isDeleteConfirmationValid
                }
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isBusy ? "Deleting Wave..." : "Delete Permanently"}
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              {isDeleteConfirmationValid
                ? "Wave name confirmed. You can now proceed with deletion."
                : "Enter the exact wave name to enable permanent deletion."}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}