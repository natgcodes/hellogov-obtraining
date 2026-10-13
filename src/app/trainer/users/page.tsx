import { redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import AddUserModal from "@/components/trainer/AddUserModal";
import DeleteUserButton from "@/components/trainer/DeleteUserButton";
import EditUserModal from "@/components/trainer/EditUserModal";
import { createClient } from "@/lib/supabase/server";

type UserProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  team_lead: string | null;
};

export default async function TrainerUsersPage() {
  const supabase = await createClient();

  // ---------------------------------------------------------
  // AUTH
  // ---------------------------------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ---------------------------------------------------------
  // TRAINER ACCESS
  // ---------------------------------------------------------

  const { data: currentProfile } =
    await supabase
      .from("profiles")
      .select(
        "full_name, email, role"
      )
      .eq("id", user.id)
      .single();

  if (
    !currentProfile ||
    currentProfile.role !== "trainer"
  ) {
    redirect("/learn");
  }

  // ---------------------------------------------------------
  // USERS
  // ---------------------------------------------------------

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, role, team_lead"
    )
    .in("role", ["learner", "trainer"])
    .order("full_name", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Unable to load users:",
      error
    );
  }

  const users = (data ?? []) as UserProfile[];

  const trainers = users.filter(
    (profile) =>
      profile.role === "trainer"
  );

  const trainees = users.filter(
    (profile) =>
      profile.role === "learner"
  );

  return (
    <AppShell
      role="trainer"
      userName={currentProfile.full_name}
      userEmail={currentProfile.email}
    >
      <div className="px-5 py-7 sm:px-7 lg:px-8 lg:py-8">
        <main className="mx-auto w-full max-w-[1440px]">
          {/* HEADER */}

          <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--teal)]">
                Training Operations
              </p>

              <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.035em] text-[var(--text-primary)] sm:text-[30px]">
                User Management
              </h1>

              <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[var(--text-secondary)]">
                Manage Learning Center
                access for trainees and
                trainers.
              </p>
            </div>

            <AddUserModal />
          </section>

          {/* ERROR */}

          {error && (
            <div className="mt-6 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-medium text-red-700">
              We couldn&apos;t load the
              user list.
            </div>
          )}

          {/* METRICS */}

          <section className="mt-7 grid gap-4 sm:grid-cols-3">
            <Metric
              label="Total users"
              value={users.length}
              helper="Learning Center accounts"
            />

            <Metric
              label="Trainees"
              value={trainees.length}
              helper="Onboarding participants"
            />

            <Metric
              label="Trainers"
              value={trainers.length}
              helper="Training administrators"
            />
          </section>

          {/* USERS */}

          <section className="mt-7 overflow-hidden rounded-[18px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-soft)] px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                  Learning Center access
                </h2>

                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  Select a user to edit their
                  account information, role or
                  Team Lead.
                </p>
              </div>

              <span className="rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)]">
                {users.length}{" "}
                {users.length === 1
                  ? "account"
                  : "accounts"}
              </span>
            </div>

            {users.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                  No users found
                </p>

                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  Add a trainee or trainer to
                  get started.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left">
                  <thead className="bg-[#FAFBFC]">
                    <tr className="border-b border-[var(--border-soft)]">
                      <TableHeader>
                        User
                      </TableHeader>

                      <TableHeader>
                        Role
                      </TableHeader>

                      <TableHeader>
                        Team Lead
                      </TableHeader>

                      <TableHeader>
                        Access
                      </TableHeader>

                      <th className="px-6 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[var(--border-soft)]">
                    {users.map(
                      (profile) => (
                        <tr
                          key={profile.id}
                          className="transition-colors hover:bg-[#FAFCFC]"
                        >
                          <td className="px-6 py-4">
                            <EditUserModal
                              user={profile}
                              isCurrentUser={
                                profile.id ===
                                user.id
                              }
                            />
                          </td>

                          <td className="px-4 py-4">
                            <RoleBadge
                              role={
                                profile.role
                              }
                            />
                          </td>

                          <td className="px-4 py-4 text-[12px] text-[var(--text-secondary)]">
                            {profile.role ===
                            "learner"
                              ? profile.team_lead ||
                                "—"
                              : "—"}
                          </td>

                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <DeleteUserButton
                              userId={
                                profile.id
                              }
                              userName={
                                profile.full_name ||
                                profile.email ||
                                "this user"
                              }
                              isCurrentUser={
                                profile.id ===
                                user.id
                              }
                            />
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </AppShell>
  );
}

function Metric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-[18px] border border-[var(--border)] bg-white px-5 py-5 shadow-[var(--shadow-xs)]">
      <p className="text-[12px] font-medium text-[var(--text-secondary)]">
        {label}
      </p>

      <p className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-[var(--text-muted)]">
        {helper}
      </p>
    </div>
  );
}

function TableHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-4 py-3 first:px-6 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
      {children}
    </th>
  );
}

function RoleBadge({
  role,
}: {
  role: string;
}) {
  const isTrainer = role === "trainer";

  return (
    <span
      className={
        isTrainer
          ? "inline-flex rounded-full bg-[#EEF2F6] px-2.5 py-1 text-[10px] font-semibold text-[#344054]"
          : "inline-flex rounded-full bg-[#EAF8FA] px-2.5 py-1 text-[10px] font-semibold text-[#07879B]"
      }
    >
      {isTrainer ? "Trainer" : "Trainee"}
    </span>
  );
}