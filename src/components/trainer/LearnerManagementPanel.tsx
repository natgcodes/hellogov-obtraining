"use client";

import {
  FormEvent,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type EnrollmentStatus =
  | "not_started"
  | "in_progress"
  | "completed";

type LearnerManagementPanelProps = {
  learnerId: string;
  programId: string;
  fullName: string | null;
  email: string | null;
  teamLead: string | null;
  enrollmentStatus: string;
};

export default function LearnerManagementPanel({
  learnerId,
  programId,
  fullName,
  email,
  teamLead,
  enrollmentStatus,
}: LearnerManagementPanelProps) {
  const router = useRouter();
  const supabase = createClient();

  const nameInputRef =
    useRef<HTMLInputElement>(null);

  const teamLeadInputRef =
    useRef<HTMLInputElement>(null);

  const initialStatus: EnrollmentStatus =
    enrollmentStatus === "completed"
      ? "completed"
      : enrollmentStatus === "in_progress"
        ? "in_progress"
        : "not_started";

  const [status, setStatus] =
    useState<EnrollmentStatus>(
      initialStatus
    );

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState(false);

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
      setError(
        "Please enter the trainee's full name."
      );
      setSuccess(false);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    // -------------------------------------------------------
    // UPDATE PROFILE
    // -------------------------------------------------------

    const { error: profileUpdateError } =
      await supabase
        .from("profiles")
        .update({
          full_name: cleanName,
          team_lead:
            cleanTeamLead || null,
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

      setSaving(false);
      return;
    }

    // -------------------------------------------------------
    // UPDATE ENROLLMENT STATUS
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

      setSaving(false);
      return;
    }

    setSuccess(true);
    setSaving(false);

    router.refresh();
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
              className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3.5 text-[12px] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[#08A9C1] focus:ring-2 focus:ring-[#08A9C1]/10"
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
              className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3.5 text-[12px] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[#08A9C1] focus:ring-2 focus:ring-[#08A9C1]/10"
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
                  event.target
                    .value as EnrollmentStatus
                );

                setError(null);
                setSuccess(false);
              }}
              className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3.5 text-[12px] text-[var(--text-primary)] outline-none transition focus:border-[#08A9C1] focus:ring-2 focus:ring-[#08A9C1]/10 md:max-w-sm"
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
              Controls the trainee&apos;s overall
              onboarding enrollment status. Changing
              this status does not reset modules,
              quizzes, checkpoints, or previous
              assessment attempts.
            </p>
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
                Trainee information updated
                successfully.
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
            disabled={saving}
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