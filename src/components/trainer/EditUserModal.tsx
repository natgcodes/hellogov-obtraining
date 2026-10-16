"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type UserRole = "learner" | "trainer" | "observer" | "cross_training" | "team_leader";

type EditableUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  team_lead: string | null;
};

type EditUserModalProps = {
  user: EditableUser;
  isCurrentUser?: boolean;
};

export default function EditUserModal({
  user,
  isCurrentUser = false,
}: EditUserModalProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [fullName, setFullName] =
    useState(user.full_name ?? "");

  const [email, setEmail] =
    useState(user.email ?? "");

  const [role, setRole] =
    useState<UserRole>(
      (user.role as UserRole)
    );

  const [teamLead, setTeamLead] =
    useState(user.team_lead ?? "");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key === "Escape" &&
        !saving
      ) {
        setOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open, saving]);

  function openModal() {
    setFullName(user.full_name ?? "");
    setEmail(user.email ?? "");
    setRole(
      (user.role as UserRole)
    );
    setTeamLead(user.team_lead ?? "");
    setError(null);
    setOpen(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setOpen(false);
    setError(null);
  }

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

    if (
      isCurrentUser &&
      role !== "trainer"
    ) {
      setError(
        "You cannot change your own role from Trainer to Trainee."
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/trainer/users",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            fullName: cleanName,
            email: cleanEmail,
            role,
            teamLead:
              role !== "trainer"
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
            "Unable to update user."
        );
      }

      setOpen(false);
      router.refresh();
    } catch (submitError) {
      console.error(
        "Unable to update user:",
        submitError
      );

      setError(
        submitError instanceof Error
          ? submitError.message
          : "We couldn't update the user. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* CLICKABLE USER */}

      <button
        type="button"
        onClick={openModal}
        className="group flex min-w-0 items-center gap-3 text-left"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF8FA] text-[10px] font-semibold text-[#07879B] transition group-hover:bg-[#DDF4F7]">
          {getInitials(
            user.full_name,
            user.email
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-[var(--text-primary)] transition group-hover:text-[#07879B]">
            {user.full_name ||
              "Unnamed user"}
          </p>

          <p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">
            {user.email ||
              "No email available"}
          </p>
        </div>
      </button>

      {/* MODAL */}

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            aria-label="Close edit user"
            disabled={saving}
            onClick={closeModal}
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
          />

          <div className="relative z-10 max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-[20px] border border-[var(--border)] bg-white shadow-2xl">
            <button
              type="button"
              onClick={closeModal}
              disabled={saving}
              aria-label="Close"
              className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white text-lg text-[var(--text-muted)] transition hover:bg-[#F8FAFB] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              ×
            </button>

            <form onSubmit={handleSubmit}>
              {/* HEADER */}

              <div className="border-b border-[var(--border-soft)] px-5 py-5 pr-16 sm:px-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
                  User Management
                </p>

                <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
                  Edit user
                </h2>

                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  Update account information
                  and Learning Center access.
                </p>
              </div>

              {/* FORM */}

              <div className="grid gap-5 px-5 py-5 sm:px-6 md:grid-cols-2">
                <div>
                  <label
                    htmlFor={`edit-name-${user.id}`}
                    className="mb-1.5 block text-[11px] font-semibold text-[var(--text-secondary)]"
                  >
                    Full name
                  </label>

                  <input
                    id={`edit-name-${user.id}`}
                    type="text"
                    value={fullName}
                    onChange={(event) => {
                      setFullName(
                        event.target.value
                      );
                      setError(null);
                    }}
                    className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3.5 text-[12px] text-[var(--text-primary)] outline-none transition focus:border-[#08A9C1] focus:ring-2 focus:ring-[#08A9C1]/10"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`edit-email-${user.id}`}
                    className="mb-1.5 block text-[11px] font-semibold text-[var(--text-secondary)]"
                  >
                    Email address
                  </label>

                  <input
                    id={`edit-email-${user.id}`}
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(
                        event.target.value
                      );
                      setError(null);
                    }}
                    className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3.5 text-[12px] text-[var(--text-primary)] outline-none transition focus:border-[#08A9C1] focus:ring-2 focus:ring-[#08A9C1]/10"
                  />

                  <p className="mt-1.5 text-[10px] leading-4 text-[var(--text-muted)]">
                    Changing this also changes
                    the email used to sign in.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor={`edit-role-${user.id}`}
                    className="mb-1.5 block text-[11px] font-semibold text-[var(--text-secondary)]"
                  >
                    Role
                  </label>

                  <select
                    id={`edit-role-${user.id}`}
                    value={role}
                    disabled={isCurrentUser}
                    onChange={(event) => {
                      const nextRole =
                        event.target
                          .value as UserRole;

                      setRole(nextRole);

                      if (
                        nextRole ===
                        "trainer"
                      ) {
                        setTeamLead("");
                      }

                      setError(null);
                    }}
                    className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3.5 text-[12px] text-[var(--text-primary)] outline-none transition focus:border-[#08A9C1] focus:ring-2 focus:ring-[#08A9C1]/10 disabled:cursor-not-allowed disabled:bg-[#F8FAFB] disabled:text-[var(--text-muted)]"
                  >
                    <option value="learner">
                      Trainee
                    </option>

                    <option value="trainer">
                      Trainer
                    </option>
                    <option value="observer">Observer</option>
                    <option value="cross_training">Cross-Training</option>
                    <option value="team_leader">Team Leader</option>
                  </select>

                  {isCurrentUser && (
                    <p className="mt-1.5 text-[10px] leading-4 text-[var(--text-muted)]">
                      You cannot change your
                      own trainer role.
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor={`edit-team-lead-${user.id}`}
                    className="mb-1.5 block text-[11px] font-semibold text-[var(--text-secondary)]"
                  >
                    Team Lead
                  </label>

                  <input
                    id={`edit-team-lead-${user.id}`}
                    type="text"
                    value={teamLead}
                    disabled={role === "trainer"}
                    onChange={(event) => {
                      setTeamLead(
                        event.target.value
                      );
                      setError(null);
                    }}
                    placeholder={
                      role === "trainer"
                        ? "Not applicable to trainers"
                        : "Enter Team Lead"
                    }
                    className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3.5 text-[12px] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[#08A9C1] focus:ring-2 focus:ring-[#08A9C1]/10 disabled:cursor-not-allowed disabled:bg-[#F8FAFB] disabled:text-[var(--text-muted)]"
                  />
                </div>
              </div>

              {error && (
                <div className="px-5 pb-5 sm:px-6">
                  <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[11px] font-medium text-red-700">
                    {error}
                  </div>
                </div>
              )}

              {/* ACTIONS */}

              <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-[var(--border-soft)] bg-[#FAFBFC] px-5 py-4 sm:px-6">
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeModal}
                  className="inline-flex min-h-9 items-center justify-center rounded-[9px] border border-[var(--border)] bg-white px-4 text-[11px] font-semibold text-[var(--text-secondary)] transition hover:bg-[#F8FAFB] disabled:opacity-50"
                >
                  Cancel
                </button>

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
          </div>
        </div>
      )}
    </>
  );
}

function getInitials(
  fullName: string | null,
  email: string | null
) {
  if (fullName?.trim()) {
    const parts = fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 1) {
      return parts[0]
        .slice(0, 2)
        .toUpperCase();
    }

    return `${parts[0][0]}${
      parts[parts.length - 1][0]
    }`.toUpperCase();
  }

  return (
    email?.charAt(0).toUpperCase() ?? "U"
  );
}