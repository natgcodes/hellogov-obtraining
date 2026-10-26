"use client";

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type EnrollmentStatus =
  | "not_started"
  | "in_progress"
  | "completed";

type TrainingWave = {
  id: string;
  title: string;
  status: string;
};

type LearnerManagementPanelProps = {
  learnerId: string;
  programId: string;
  activeProgramId: string | null;
  availableWaves: TrainingWave[];
  fullName: string | null;
  email: string | null;
  teamLead: string | null;
  enrollmentStatus: string;
};

function normalizeStatus(
  value: string
): EnrollmentStatus {
  if (value === "completed") {
    return "completed";
  }

  if (value === "in_progress") {
    return "in_progress";
  }

  return "not_started";
}

export default function LearnerManagementPanel({
  learnerId,
  programId,
  activeProgramId,
  availableWaves,
  fullName,
  email,
  teamLead,
  enrollmentStatus,
}: LearnerManagementPanelProps) {
  const router = useRouter();

  const nameInputRef = useRef<HTMLInputElement>(null);
  const teamLeadInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] =
    useState<EnrollmentStatus>(
      normalizeStatus(enrollmentStatus)
    );

  const [selectedWaveId, setSelectedWaveId] =
    useState(activeProgramId ?? "");

  const [saving, setSaving] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] = useState(false);

  // Keep form values synchronized after router.refresh().
  useEffect(() => {
    setSelectedWaveId(activeProgramId ?? "");
    setStatus(normalizeStatus(enrollmentStatus));
  }, [activeProgramId, enrollmentStatus]);

  const waveChanged =
    selectedWaveId !== (activeProgramId ?? "");

  const selectedWave = availableWaves.find(
    (wave) => wave.id === selectedWaveId
  );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    const cleanName =
      nameInputRef.current?.value.trim() ?? "";

    const cleanTeamLead =
      teamLeadInputRef.current?.value.trim() ?? "";

    if (!cleanName) {
      setError("Please enter the trainee's full name.");
      setSuccess(false);
      return;
    }

    if (!selectedWaveId) {
      setError("Please select a training wave.");
      setSuccess(false);
      return;
    }

    if (
      !availableWaves.some(
        (wave) => wave.id === selectedWaveId
      )
    ) {
      setError("The selected training wave is unavailable.");
      setSuccess(false);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();

    try {
      // -------------------------------------------------------
      // UPDATE PROFILE
      // -------------------------------------------------------

      const { error: profileUpdateError } =
        await supabase
          .from("profiles")
          .update({
            full_name: cleanName,
            team_lead: cleanTeamLead || null,
          })
          .eq("id", learnerId);

      if (profileUpdateError) {
        console.error(
          "Unable to update trainee profile:",
          profileUpdateError
        );

        setError(
          "We couldn't save the trainee information. Please try again."
        );
        return;
      }

      // -------------------------------------------------------
      // ASSIGN TRAINING WAVE
      // -------------------------------------------------------

      if (waveChanged) {
        const { error: waveAssignmentError } =
          await supabase.rpc(
            "trainer_assign_learner_wave",
            {
              target_learner_id: learnerId,
              target_program_id: selectedWaveId,
            }
          );

        if (waveAssignmentError) {
          console.error(
            "Unable to assign training wave:",
            waveAssignmentError
          );

          setError(
            "The trainee information was saved, but the training wave could not be assigned."
          );
          return;
        }

        // The new wave starts with its existing enrollment
        // status (or not_started if newly enrolled).
        // Do not copy the previous wave's status.

        setSuccess(true);
        router.refresh();
        return;
      }

      // -------------------------------------------------------
      // UPDATE CURRENT WAVE ENROLLMENT STATUS
      // -------------------------------------------------------

      const { error: statusUpdateError } =
        await supabase.rpc(
          "trainer_update_learner_status",
          {
            target_program_id: programId,
            target_learner_id: learnerId,
            new_status: status,
          }
        );

      if (statusUpdateError) {
        console.error(
          "Unable to update enrollment status:",
          statusUpdateError
        );

        setError(
          "The trainee information was saved, but the enrollment status could not be updated."
        );
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch (unexpectedError) {
      console.error(
        "Unexpected trainee update error:",
        unexpectedError
      );

      setError(
        "Something went wrong while saving. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[18px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
      {/* HEADER */}

      <div className="border-b border-[var(--border-soft)] px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
              Training Management
            </p>

            <h2 className="mt-1 text-[16px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
              Trainee information
            </h2>

            <p className="mt-1 text-[11px] leading-5 text-[var(--text-muted)]">
              Manage the trainee&apos;s account and
              onboarding information.
            </p>
          </div>

          <span className="inline-flex rounded-full bg-[#EAF8FA] px-2.5 py-1 text-[10px] font-semibold text-[#07879B]">
            Trainee
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-x-5 gap-y-5 px-5 py-5 sm:px-6 md:grid-cols-2">
          {/* FULL NAME */}

          <div>
            <label
              htmlFor="trainee-full-name"
              className="mb-1.5 block text-[11px] font-semibold text-[var(--text-secondary)]"
            >
              Full name
            </label>

            <input
              ref={nameInputRef}
              id="trainee-full-name"
              name="fullName"
              type="text"
              defaultValue={fullName ?? ""}
              placeholder="Enter full name"
              disabled={saving}
              className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3.5 text-[12px] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[#08A9C1] focus:ring-2 focus:ring-[#08A9C1]/10 disabled:opacity-60"
            />

            <p className="mt-1.5 text-[10px] leading-4 text-[var(--text-muted)]">
              The name displayed throughout the
              Learning Center.
            </p>
          </div>

          {/* TEAM LEAD */}

          <div>
            <label
              htmlFor="trainee-team-lead"
              className="mb-1.5 block text-[11px] font-semibold text-[var(--text-secondary)]"
            >
              Team Lead
            </label>

            <input
              ref={teamLeadInputRef}
              id="trainee-team-lead"
              name="teamLead"
              type="text"
              defaultValue={teamLead ?? ""}
              placeholder="Enter Team Lead"
              disabled={saving}
              className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3.5 text-[12px] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[#08A9C1] focus:ring-2 focus:ring-[#08A9C1]/10 disabled:opacity-60"
            />

            <p className="mt-1.5 text-[10px] leading-4 text-[var(--text-muted)]">
              Assigned operational Team Lead.
            </p>
          </div>

          {/* EMAIL */}

          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-[var(--text-secondary)]">
              Email address
            </p>

            <div className="flex min-h-10 items-center rounded-[10px] border border-[var(--border)] bg-[#F8FAFB] px-3.5 text-[12px] text-[var(--text-secondary)]">
              <span className="truncate">
                {email || "No email available"}
              </span>
            </div>

            <p className="mt-1.5 text-[10px] leading-4 text-[var(--text-muted)]">
              Email addresses cannot be changed
              from Training Management.
            </p>
          </div>

          {/* ROLE */}

          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-[var(--text-secondary)]">
              Role
            </p>

            <div className="flex min-h-10 items-center rounded-[10px] border border-[var(--border)] bg-[#F8FAFB] px-3.5">
              <span className="inline-flex rounded-full bg-[#EAF8FA] px-2.5 py-1 text-[10px] font-semibold text-[#07879B]">
                Trainee
              </span>
            </div>

            <p className="mt-1.5 text-[10px] leading-4 text-[var(--text-muted)]">
              Account roles are managed by the
              Training team.
            </p>
          </div>

          {/* ASSIGNED WAVE */}

          <div className="md:col-span-2">
            <label
              htmlFor="assigned-wave"
              className="mb-1.5 block text-[11px] font-semibold text-[var(--text-secondary)]"
            >
              Assigned Wave
            </label>

            <select
              id="assigned-wave"
              value={selectedWaveId}
              onChange={(event) => {
                setSelectedWaveId(event.target.value);
                setError(null);
                setSuccess(false);
              }}
              disabled={saving}
              className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3.5 text-[12px] text-[var(--text-primary)] outline-none transition focus:border-[#08A9C1] focus:ring-2 focus:ring-[#08A9C1]/10 disabled:opacity-60 md:max-w-sm"
            >
              <option value="" disabled>
                Select a training wave
              </option>

              {availableWaves.map((wave) => (
                <option
                  key={wave.id}
                  value={wave.id}
                >
                  {wave.title}
                  {wave.status === "draft"
                    ? " (Draft)"
                    : ""}
                </option>
              ))}
            </select>

            <p className="mt-1.5 max-w-2xl text-[10px] leading-4 text-[var(--text-muted)]">
              Assign this trainee to an onboarding wave.
              Previous enrollments and training progress
              will be preserved.
            </p>

            {selectedWave?.status === "draft" && (
              <p className="mt-2 text-[10px] font-medium text-amber-700">
                This wave is currently a draft.
                Trainees will not be able to access
                its training content until it is published.
              </p>
            )}

            {waveChanged && (
              <p className="mt-2 text-[10px] font-medium text-[#07879B]">
                Saving will switch the trainee&apos;s
                active wave. The enrollment status
                from the previous wave will not be copied.
              </p>
            )}
          </div>

          {/* ENROLLMENT STATUS */}

          <div className="md:col-span-2">
            <label
              htmlFor="enrollment-status"
              className="mb-1.5 block text-[11px] font-semibold text-[var(--text-secondary)]"
            >
              Enrollment status
            </label>

            <select
              id="enrollment-status"
              value={status}
              onChange={(event) => {
                setStatus(
                  event.target.value as EnrollmentStatus
                );

                setError(null);
                setSuccess(false);
              }}
              disabled={saving || waveChanged}
              className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3.5 text-[12px] text-[var(--text-primary)] outline-none transition focus:border-[#08A9C1] focus:ring-2 focus:ring-[#08A9C1]/10 disabled:cursor-not-allowed disabled:bg-[#F8FAFB] disabled:opacity-60 md:max-w-sm"
            >
              <option value="not_started">
                Not started
              </option>

              <option value="in_progress">
                In progress
              </option>

              <option value="completed">
                Completed
              </option>
            </select>

            <p className="mt-1.5 max-w-2xl text-[10px] leading-4 text-[var(--text-muted)]">
              Controls the trainee&apos;s enrollment
              status for the currently assigned wave.
              Changing this status does not reset
              modules, quizzes, checkpoints, or
              previous assessment attempts.
            </p>

            {waveChanged && (
              <p className="mt-2 text-[10px] text-[var(--text-muted)]">
                Save the wave assignment first.
                You can then update the enrollment
                status for the newly assigned wave.
              </p>
            )}
          </div>
        </div>

        {/* FEEDBACK */}

        {(error || success) && (
          <div className="px-5 pb-5 sm:px-6">
            {error && (
              <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[11px] font-medium text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[11px] font-medium text-emerald-700">
                Trainee information updated successfully.
              </div>
            )}
          </div>
        )}

        {/* ACTION BAR */}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-soft)] bg-[#FAFBFC] px-5 py-4 sm:px-6">
          <p className="text-[10px] text-[var(--text-muted)]">
            Changes are saved to the shared
            training profile.
          </p>

          <button
            type="submit"
            disabled={saving || !selectedWaveId}
            className="inline-flex min-h-9 items-center justify-center rounded-[9px] bg-[#101828] px-4 text-[11px] font-semibold text-white transition hover:bg-[#1D2939] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}