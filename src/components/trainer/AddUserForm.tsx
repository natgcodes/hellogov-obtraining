"use client";

import {
  FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type UserRole = "learner" | "trainer";

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

  const [success, setSuccess] =
    useState<string | null>(null);

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

    setSaving(true);
    setError(null);
    setSuccess(null);

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

      setSuccess(
        role === "trainer"
          ? "Trainer invitation sent successfully."
          : "Trainee invitation sent successfully."
      );

      setFullName("");
      setEmail("");
      setRole("learner");
      setTeamLead("");

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
          Invite a trainee or trainer to the
          HelloGov Learning Center.
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
              setSuccess(null);
            }}
            placeholder="Enter full name"
            autoComplete="off"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-[#e84545] focus:ring-2 focus:ring-red-50"
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
              setSuccess(null);
            }}
            placeholder="name@hellogov.com"
            autoComplete="off"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-[#e84545] focus:ring-2 focus:ring-red-50"
          />
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
              setSuccess(null);
            }}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-[#e84545] focus:ring-2 focus:ring-red-50"
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
                setSuccess(null);
              }}
              placeholder="Enter Team Lead"
              autoComplete="off"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-[#e84545] focus:ring-2 focus:ring-red-50"
            />

            <p className="mt-1.5 text-xs text-slate-400">
              Optional. This can be assigned
              later.
            </p>
          </div>
        )}
      </div>

      {/* INVITATION INFO */}

      <div className="mx-6 mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-medium text-slate-700">
          Invitation
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          The user will receive an email
          invitation to activate their account
          and set up their password.
        </p>
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
              {success}
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
            ? "Sending invitation..."
            : "Send invitation"}
        </button>
      </div>
    </form>
  );
}