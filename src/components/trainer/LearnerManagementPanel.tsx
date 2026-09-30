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
    <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* HEADER */}

      <div className="border-b border-slate-200 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e84545]">
          Training Management
        </p>

        <h2 className="mt-2 text-xl font-semibold text-slate-950">
          Trainee information
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Manage the trainee&apos;s account and
          onboarding information.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-5 px-6 py-6 md:grid-cols-2">
          {/* FULL NAME */}

          <div>
            <label
              htmlFor="trainee-full-name"
              className="mb-1.5 block text-sm font-medium text-slate-700"
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
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-[#e84545] focus:ring-2 focus:ring-red-50"
            />

            <p className="mt-1.5 text-xs text-slate-400">
              The name displayed throughout the
              Learning Center.
            </p>
          </div>

          {/* TEAM LEAD */}

          <div>
            <label
              htmlFor="trainee-team-lead"
              className="mb-1.5 block text-sm font-medium text-slate-700"
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
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-[#e84545] focus:ring-2 focus:ring-red-50"
            />

            <p className="mt-1.5 text-xs text-slate-400">
              Assigned operational Team Lead.
            </p>
          </div>

          {/* EMAIL */}

          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">
              Email address
            </p>

            <div className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-600">
              {email || "No email available"}
            </div>

            <p className="mt-1.5 text-xs text-slate-400">
              Email addresses cannot be changed
              from Training Management.
            </p>
          </div>

          {/* ROLE */}

          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">
              Role
            </p>

            <div className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3.5">
              <span className="inline-flex rounded-full bg-[#e84545]/10 px-2.5 py-1 text-xs font-semibold text-[#e84545]">
                Trainee
              </span>
            </div>

            <p className="mt-1.5 text-xs text-slate-400">
              Account roles are managed by the
              Training team.
            </p>
          </div>

          {/* ENROLLMENT STATUS */}

          <div className="md:col-span-2">
            <label
              htmlFor="enrollment-status"
              className="mb-1.5 block text-sm font-medium text-slate-700"
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
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-[#e84545] focus:ring-2 focus:ring-red-50 md:max-w-sm"
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

            <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-400">
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
          <div className="px-6 pb-5">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                Trainee information updated
                successfully.
              </div>
            )}
          </div>
        )}

        {/* ACTION BAR */}

        <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50/50 px-6 py-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
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