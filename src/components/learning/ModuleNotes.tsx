"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  moduleId: string;
  learnerId?: string;
  readOnly?: boolean;
};

export default function ModuleNotes({
  moduleId,
  learnerId,
  readOnly = false,
}: Props) {
  const supabase = createClient();

  const [note, setNote] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------
  // LOAD NOTE
  // ---------------------------------------------------------

  useEffect(() => {
    let active = true;

    async function loadNote() {
      setLoading(true);
      setError(null);
      setSaved(false);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (active) {
            setError("We couldn't load the notes.");
          }

          return;
        }

        // Normal learner view:
        // use the authenticated learner.
        //
        // Impersonation view:
        // use the trainee explicitly provided by the trainer page.
        const targetLearnerId =
          readOnly && learnerId
            ? learnerId
            : user.id;

        const {
          data,
          error: noteError,
        } = await supabase
          .from("learner_module_notes")
          .select("note")
          .eq("learner_id", targetLearnerId)
          .eq("module_id", moduleId)
          .maybeSingle();

        if (noteError) {
          console.error(
            "Unable to load module note:",
            noteError
          );

          if (active) {
            setError("We couldn't load the notes.");
          }

          return;
        }

        const existingNote = data?.note ?? "";

        if (active) {
          setNote(existingNote);
          setSavedNote(existingNote);
        }
      } catch (loadError) {
        console.error(
          "Unexpected error loading module note:",
          loadError
        );

        if (active) {
          setError("We couldn't load the notes.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadNote();

    return () => {
      active = false;
    };
  }, [moduleId, learnerId, readOnly]);

  // ---------------------------------------------------------
  // SAVE NOTE
  // ---------------------------------------------------------

  async function handleSave() {
    if (readOnly || saving) {
      return;
    }

    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError(
          "We couldn't verify your account. Please sign in again."
        );
        return;
      }

      const cleanNote = note.trim();

      if (!cleanNote) {
        if (savedNote) {
          const { error: deleteError } =
            await supabase
              .from("learner_module_notes")
              .delete()
              .eq("learner_id", user.id)
              .eq("module_id", moduleId);

          if (deleteError) {
            console.error(
              "Unable to delete module note:",
              deleteError
            );

            setError(
              "We couldn't update your notes."
            );
            return;
          }
        }

        setNote("");
        setSavedNote("");
        setSaved(true);
        return;
      }

      const { error: saveError } =
        await supabase
          .from("learner_module_notes")
          .upsert(
            {
              learner_id: user.id,
              module_id: moduleId,
              note: cleanNote,
              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict:
                "learner_id,module_id",
            }
          );

      if (saveError) {
        console.error(
          "Unable to save module note:",
          saveError
        );

        setError(
          "We couldn't save your notes."
        );
        return;
      }

      setNote(cleanNote);
      setSavedNote(cleanNote);
      setSaved(true);
    } catch (saveError) {
      console.error(
        "Unexpected error saving module note:",
        saveError
      );

      setError(
        "We couldn't save your notes."
      );
    } finally {
      setSaving(false);
    }
  }

  const hasChanges =
    note !== savedNote;

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <div className="border-t border-[var(--border-soft)] px-5 py-5 sm:px-7">
      <div className="rounded-[14px] border border-[#d8e8eb] bg-[#f8fcfd] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#e4f7fa] text-[#087f91]">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 19.5V5a2 2 0 0 1 2-2h9l5 5v11.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5Z" />
                  <path d="M14 3v6h6" />
                  <path d="M8 13h8" />
                  <path d="M8 17h6" />
                </svg>
              </div>

              <div>
                <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                  Notes
                </p>

                <p className="mt-0.5 text-[10.5px] text-[var(--text-secondary)]">
                  {readOnly
                    ? "Notes saved by this trainee for this topic."
                    : "Keep track of questions or topics to discuss during live sessions."}
                </p>
              </div>
            </div>
          </div>

          {readOnly && (
            <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[9.5px] font-semibold text-[var(--text-muted)]">
              Read only
            </span>
          )}

          {!readOnly &&
            saved &&
            !hasChanges && (
              <span className="rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-[9.5px] font-semibold text-[var(--success)]">
                Saved
              </span>
            )}
        </div>

        {loading ? (
          <div className="mt-4 rounded-[10px] border border-[var(--border)] bg-white px-3.5 py-4">
            <p className="text-[11px] text-[var(--text-muted)]">
              Loading notes...
            </p>
          </div>
        ) : error ? (
          <div className="mt-4 rounded-[10px] border border-red-200 bg-white px-3.5 py-4">
            <p className="text-[11px] text-red-600">
              {error}
            </p>
          </div>
        ) : readOnly ? (
          <div className="mt-4 rounded-[10px] border border-[var(--border)] bg-white px-3.5 py-3">
            {note ? (
              <p className="whitespace-pre-wrap text-[12px] leading-5 text-[var(--text-primary)]">
                {note}
              </p>
            ) : (
              <p className="text-[11px] italic text-[var(--text-muted)]">
                No notes added for this topic.
              </p>
            )}
          </div>
        ) : (
          <>
            <textarea
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
                setSaved(false);

                if (error) {
                  setError(null);
                }
              }}
              rows={4}
              maxLength={3000}
              placeholder="Write your notes, questions, or reminders for this topic..."
              className="mt-4 w-full resize-y rounded-[10px] border border-[var(--border)] bg-white px-3.5 py-3 text-[12px] leading-5 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[#08A9C1] focus:ring-4 focus:ring-[#08A9C1]/10"
            />

            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {note.length}/3000
                </p>
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={
                  saving || !hasChanges
                }
                className="inline-flex h-8 items-center justify-center rounded-[8px] bg-[#08A9C1] px-3.5 text-[10.5px] font-semibold !text-white transition-colors hover:bg-[#0795AA] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving
                  ? "Saving..."
                  : "Save notes"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}