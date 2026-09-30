"use client";

import {
  FormEvent,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ProfileFormProps = {
  userId: string;
  fullName: string | null;
  email: string | null;
  teamLeadName: string | null;
};

export default function ProfileForm({
  userId,
  fullName,
  email,
  teamLeadName,
}: ProfileFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const nameInputRef =
    useRef<HTMLInputElement>(null);

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

    if (!cleanName) {
      setError(
        "Please enter your full name."
      );
      setSuccess(false);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    const { error: updateError } =
      await supabase
        .from("profiles")
        .update({
          full_name: cleanName,
        })
        .eq("id", userId);

    if (updateError) {
      console.error(
        "Unable to update profile:",
        updateError
      );

      setError(
        "We couldn't save your changes. Please try again."
      );

      setSaving(false);
      return;
    }

    setSuccess(true);
    setSaving(false);

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="px-5 py-6 sm:px-6">
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
            Personal information
          </h3>

          <p className="mt-1 text-[12px] leading-5 text-[var(--text-muted)]">
            Your basic account information used
            throughout the Learning Center.
          </p>
        </div>

        <div className="mt-6 space-y-5">
          {/* FULL NAME */}

          <div>
            <label
              htmlFor="full-name"
              className="mb-1.5 block text-[12px] font-medium text-[var(--text-secondary)]"
            >
              Full name
            </label>

            <input
              ref={nameInputRef}
              id="full-name"
              name="fullName"
              type="text"
              defaultValue={fullName ?? ""}
              placeholder="Enter your full name"
              className="h-10 w-full rounded-[9px] border border-[var(--border)] bg-white px-3.5 text-[13px] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)]"
            />

            <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
              This name will appear throughout
              your Learning Center.
            </p>
          </div>

          {/* EMAIL */}

          <div>
            <label
              htmlFor="profile-email"
              className="mb-1.5 block text-[12px] font-medium text-[var(--text-secondary)]"
            >
              Email address
            </label>

            <div
              id="profile-email"
              className="flex min-h-10 w-full items-center rounded-[9px] border border-[var(--border)] bg-[var(--surface-soft)] px-3.5 text-[13px] text-[var(--text-secondary)]"
            >
              {email || "No email available"}
            </div>

            <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
              Your email address is linked to your
              HelloGov account.
            </p>
          </div>

          {/* ROLE */}

          <div>
            <p className="mb-1.5 text-[12px] font-medium text-[var(--text-secondary)]">
              Role
            </p>

            <div className="flex h-10 items-center rounded-[9px] border border-[var(--border)] bg-[var(--surface-soft)] px-3.5">
              <span className="inline-flex rounded-full bg-[var(--teal-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--teal-deep)]">
                Trainee
              </span>
            </div>

            <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
              Account roles are managed by the
              Training team.
            </p>
          </div>

          {/* TEAM LEAD */}

          <div>
            <p className="mb-1.5 text-[12px] font-medium text-[var(--text-secondary)]">
              Team Lead
            </p>

            <div className="flex min-h-10 w-full items-center rounded-[9px] border border-[var(--border)] bg-[var(--surface-soft)] px-3.5 text-[13px] text-[var(--text-secondary)]">
              {teamLeadName || "Not assigned"}
            </div>

            <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
              Your assigned Team Lead is managed by
              the Training team.
            </p>
          </div>
        </div>

        {/* FEEDBACK */}

        {error && (
          <div className="mt-5 rounded-[9px] border border-red-100 bg-red-50 px-3.5 py-3 text-[12px] font-medium text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-5 rounded-[9px] border border-emerald-100 bg-emerald-50 px-3.5 py-3 text-[12px] font-medium text-emerald-700">
            Profile updated successfully.
          </div>
        )}
      </div>

      {/* SAVE */}

      <div className="flex items-center justify-end border-t border-[var(--border-soft)] bg-[var(--surface-soft)]/40 px-5 py-4 sm:px-6">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-9 items-center justify-center rounded-[9px] bg-[var(--teal)] px-4 text-[12px] font-semibold text-white transition hover:bg-[var(--teal-deep)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving
            ? "Saving..."
            : "Save changes"}
        </button>
      </div>
    </form>
  );
}