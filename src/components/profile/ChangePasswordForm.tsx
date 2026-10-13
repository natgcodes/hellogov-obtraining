"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ChangePasswordForm() {
  const supabase = createClient();

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError(
        "Your password must contain at least 8 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        "The passwords do not match."
      );
      return;
    }

    setSaving(true);

    try {
      const { error: updateError } =
        await supabase.auth.updateUser({
          password: newPassword,
        });

      if (updateError) {
        throw updateError;
      }

      setNewPassword("");
      setConfirmPassword("");

      setSuccess(
        "Your password has been changed successfully."
      );
    } catch (updateError) {
      console.error(
        "Unable to change password:",
        updateError
      );

      setError(
        updateError instanceof Error
          ? updateError.message
          : "We couldn't change your password. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-5 max-w-[760px] overflow-hidden rounded-[16px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
      {/* HEADER */}

      <div className="border-b border-[var(--border-soft)] px-5 py-5 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
          Security
        </p>

        <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
          Change password
        </h2>

        <p className="mt-1.5 max-w-[560px] text-[13px] leading-5 text-[var(--text-secondary)]">
          Update the password you use to access
          the HelloGov Learning Center.
        </p>
      </div>

      {/* FORM */}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-5 px-5 py-5 sm:px-6 md:grid-cols-2">
          {/* NEW PASSWORD */}

          <div>
            <label
              htmlFor="new-password"
              className="mb-1.5 block text-[13px] font-medium text-[var(--text-primary)]"
            >
              New password
            </label>

            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(
                  event.target.value
                );
                setError(null);
                setSuccess(null);
              }}
              autoComplete="new-password"
              placeholder="Enter new password"
              disabled={saving}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--teal)] focus:ring-2 focus:ring-cyan-50 disabled:bg-slate-50"
            />

            <p className="mt-1.5 text-[11px] leading-4 text-[var(--text-muted)]">
              Use at least 8 characters.
            </p>
          </div>

          {/* CONFIRM PASSWORD */}

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-1.5 block text-[13px] font-medium text-[var(--text-primary)]"
            >
              Confirm new password
            </label>

            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(
                  event.target.value
                );
                setError(null);
                setSuccess(null);
              }}
              autoComplete="new-password"
              placeholder="Enter password again"
              disabled={saving}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--teal)] focus:ring-2 focus:ring-cyan-50 disabled:bg-slate-50"
            />
          </div>
        </div>

        {/* FEEDBACK */}

        {(error || success) && (
          <div className="px-5 pb-5 sm:px-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-medium text-emerald-700">
                {success}
              </div>
            )}
          </div>
        )}

        {/* ACTION BAR */}

        <div className="flex items-center justify-end border-t border-[var(--border-soft)] bg-slate-50/50 px-5 py-4 sm:px-6">
          <button
            type="submit"
            disabled={
              saving ||
              !newPassword ||
              !confirmPassword
            }
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Changing password..."
              : "Change password"}
          </button>
        </div>
      </form>
    </section>
  );
}