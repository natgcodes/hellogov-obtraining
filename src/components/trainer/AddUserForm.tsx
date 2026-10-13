"use client";

import {
  FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type UserRole = "learner" | "trainer";

type CreatedAccount = {
  fullName: string;
  email: string;
  role: UserRole;
  temporaryPassword: string;
};

export default function AddUserForm() {
  const router = useRouter();

  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [role, setRole] =
    useState<UserRole>("learner");

  const [teamLead, setTeamLead] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [createdAccount, setCreatedAccount] =
    useState<CreatedAccount | null>(null);

  const [copied, setCopied] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    const cleanName = fullName.trim();

    const cleanEmail = email
      .trim()
      .toLowerCase();

    const cleanTeamLead =
      teamLead.trim();

    if (!cleanName) {
      setError(
        "Please enter the user's full name."
      );
      return;
    }

    if (!cleanEmail) {
      setError(
        "Please enter an email address."
      );
      return;
    }

    const allowedEmail =
      cleanEmail.endsWith("@ivisa.com") ||
      cleanEmail.endsWith("@hellogov.com");

    if (!allowedEmail) {
      setError(
        "Only @ivisa.com and @hellogov.com email addresses are allowed."
      );
      return;
    }

    setSaving(true);
    setError(null);
    setCopied(false);

    try {
      const response = await fetch(
        "/api/trainer/users",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            fullName: cleanName,
            email: cleanEmail,
            role,
            teamLead:
              role === "learner"
                ? cleanTeamLead || null
                : null,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to create user."
        );
      }

      if (!result?.temporaryPassword) {
        throw new Error(
          "The account was created, but no temporary password was returned."
        );
      }

      setCreatedAccount({
        fullName: cleanName,
        email: cleanEmail,
        role,
        temporaryPassword:
          result.temporaryPassword,
      });

      router.refresh();
    } catch (submitError) {
      console.error(
        "Unable to create user:",
        submitError
      );

      setError(
        submitError instanceof Error
          ? submitError.message
          : "We couldn't create the user. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  async function copyPassword() {
    if (!createdAccount) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        createdAccount.temporaryPassword
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (copyError) {
      console.error(
        "Unable to copy password:",
        copyError
      );

      setError(
        "The password could not be copied automatically. Please copy it manually."
      );
    }
  }

  async function copyCredentials() {
    if (!createdAccount) {
      return;
    }

    const credentials = [
      "HelloGov Learning Center",
      "",
      `Email: ${createdAccount.email}`,
      `Temporary password: ${createdAccount.temporaryPassword}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(
        credentials
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (copyError) {
      console.error(
        "Unable to copy credentials:",
        copyError
      );

      setError(
        "The credentials could not be copied automatically. Please copy them manually."
      );
    }
  }

  function createAnotherUser() {
    setFullName("");
    setEmail("");
    setRole("learner");
    setTeamLead("");
    setError(null);
    setCreatedAccount(null);
    setCopied(false);
  }

  // =========================================================
  // SUCCESS SCREEN
  // =========================================================

  if (createdAccount) {
    return (
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {/* HEADER */}

        <div className="border-b border-slate-200 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
            Account created
          </p>

          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            User ready to sign in
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            No invitation email was sent.
            Share the credentials below directly
            with the user.
          </p>
        </div>

        {/* SUCCESS MESSAGE */}

        <div className="px-6 pt-6">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-800">
              Account created successfully
            </p>

            <p className="mt-1 text-xs leading-5 text-emerald-700">
              {createdAccount.fullName} can
              sign in immediately using these
              credentials.
            </p>
          </div>
        </div>

        {/* CREDENTIALS */}

        <div className="space-y-5 px-6 py-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">
              Email
            </p>

            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="break-all text-sm font-medium text-slate-800">
                {createdAccount.email}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">
                Temporary password
              </p>

              <button
                type="button"
                onClick={copyPassword}
                className="text-xs font-semibold text-[#08788A] transition hover:text-[#056979]"
              >
                Copy password
              </button>
            </div>

            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="break-all font-mono text-sm font-semibold tracking-[0.04em] text-slate-900">
                {
                  createdAccount.temporaryPassword
                }
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900">
              Save these credentials now
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-800">
              This temporary password is shown
              only after the account is created.
              Share it privately with the user.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {copied && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              Copied to clipboard.
            </div>
          )}
        </div>

        {/* ACTION BAR */}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 px-6 py-4">
          <button
            type="button"
            onClick={createAnotherUser}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Create another user
          </button>

          <button
            type="button"
            onClick={copyCredentials}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {copied
              ? "Copied"
              : "Copy credentials"}
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // CREATE USER FORM
  // =========================================================

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      {/* HEADER */}

      <div className="border-b border-slate-200 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e84545]">
          User Management
        </p>

        <h2 className="mt-2 text-xl font-semibold text-slate-950">
          Add user
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Create access for a trainee or
          trainer in the HelloGov Learning
          Center.
        </p>
      </div>

      {/* FORM */}

      <div className="grid gap-5 px-6 py-6 md:grid-cols-2">
        {/* FULL NAME */}

        <div>
          <label
            htmlFor="new-user-name"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Full name
          </label>

          <input
            id="new-user-name"
            type="text"
            value={fullName}
            onChange={(event) => {
              setFullName(
                event.target.value
              );
              setError(null);
            }}
            placeholder="Enter full name"
            autoComplete="off"
            disabled={saving}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-[#e84545] focus:ring-2 focus:ring-red-50 disabled:bg-slate-50"
          />
        </div>

        {/* EMAIL */}

        <div>
          <label
            htmlFor="new-user-email"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Email address
          </label>

          <input
            id="new-user-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError(null);
            }}
            placeholder="name@hellogov.com"
            autoComplete="off"
            disabled={saving}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-[#e84545] focus:ring-2 focus:ring-red-50 disabled:bg-slate-50"
          />

          <p className="mt-1.5 text-xs text-slate-400">
            Only @ivisa.com and @hellogov.com
            accounts are allowed.
          </p>
        </div>

        {/* ROLE */}

        <div>
          <label
            htmlFor="new-user-role"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Role
          </label>

          <select
            id="new-user-role"
            value={role}
            onChange={(event) => {
              const nextRole =
                event.target
                  .value as UserRole;

              setRole(nextRole);

              if (
                nextRole === "trainer"
              ) {
                setTeamLead("");
              }

              setError(null);
            }}
            disabled={saving}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-[#e84545] focus:ring-2 focus:ring-red-50 disabled:bg-slate-50"
          >
            <option value="learner">
              Trainee
            </option>

            <option value="trainer">
              Trainer
            </option>
          </select>
        </div>

        {/* TEAM LEAD */}

        {role === "learner" && (
          <div>
            <label
              htmlFor="new-user-team-lead"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Team Lead
            </label>

            <input
              id="new-user-team-lead"
              type="text"
              value={teamLead}
              onChange={(event) => {
                setTeamLead(
                  event.target.value
                );
                setError(null);
              }}
              placeholder="Enter Team Lead"
              autoComplete="off"
              disabled={saving}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-[#e84545] focus:ring-2 focus:ring-red-50 disabled:bg-slate-50"
            />

            <p className="mt-1.5 text-xs text-slate-400">
              Optional. This can be assigned
              later.
            </p>
          </div>
        )}
      </div>

      {/* ACCOUNT INFO */}

      <div className="mx-6 mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-medium text-slate-700">
          Account setup
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          A temporary password will be
          generated automatically. No email
          will be sent. You will be able to
          copy the login credentials after
          creating the account.
        </p>
      </div>

      {/* ERROR */}

      {error && (
        <div className="px-6 pb-5">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
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
            ? "Creating account..."
            : "Create account"}
        </button>
      </div>
    </form>
  );
}