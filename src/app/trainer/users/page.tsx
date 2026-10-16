import { redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import AddUserModal from "@/components/trainer/AddUserModal";
import AccountStatusButton from "@/components/trainer/AccountStatusButton";
import EditUserModal from "@/components/trainer/EditUserModal";
import TeamAssignments from "@/components/trainer/TeamAssignments";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { HELLOGOV_PROGRAM_ID } from "@/lib/constants/program";
import { getTrainerProgram } from "@/lib/trainer/getTrainerProgram";

type UserProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  team_lead: string | null;
  account_status: "active" | "deactivated";
};

type UserStatus =
  | "not_logged_in"
  | "logged_in"
  | "in_progress"
  | "completed";

type Enrollment = {
  learner_id: string;
  status: string;
};

type LearnerProgress = {
  learner_id: string;
  progress_percent: number | null;
};

// ============================================================
// USER STATUS
// ============================================================

function getUserStatus({
  role,
  lastSignInAt,
  enrollmentStatus,
  progressPercent,
}: {
  role: string;
  lastSignInAt: string | null;
  enrollmentStatus: string | null;
  progressPercent: number;
}): UserStatus {
  // Never logged in
  if (!lastSignInAt) {
    return "not_logged_in";
  }

  // Trainers do not complete learner onboarding
  if (role === "trainer") {
    return "logged_in";
  }

  // Completed onboarding
  if (enrollmentStatus === "completed") {
    return "completed";
  }

  // Started onboarding
  if (
    enrollmentStatus === "in_progress" ||
    progressPercent > 0
  ) {
    return "in_progress";
  }

  // Logged in but has not started onboarding
  return "logged_in";
}

// ============================================================
// PAGE
// ============================================================

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

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
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
    .select("id, full_name, email, role, team_lead, account_status")
    .in("role", ["learner", "trainer", "observer", "cross_training", "team_leader"])
    .order("full_name", {
      ascending: true,
    });

  if (error) {
    console.error("Unable to load users:", error);
  }

  const users = (data ?? []) as UserProfile[];

  const trainers = users.filter(
    (profile) => profile.role === "trainer"
  );

  const trainees = users.filter(
    (profile) => profile.role === "learner"
  );

  // ---------------------------------------------------------
  // FETCH AUTH LOGIN INFORMATION
  // ---------------------------------------------------------

  const admin = createAdminClient();
  const {data:assignmentRows} = await admin.from("team_leader_assignments").select("team_leader_id,learner_id");

  const lastSignInMap = new Map<string, string | null>();

  const {
    data: authUsers,
    error: authUsersError,
  } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (authUsersError) {
    console.error(
      "Unable to load login information:",
      authUsersError
    );
  }

  for (const authUser of authUsers?.users ?? []) {
    lastSignInMap.set(
      authUser.id,
      authUser.last_sign_in_at ?? null
    );
  }

  // ---------------------------------------------------------
  // FETCH LEARNER ENROLLMENT STATUS
  // ---------------------------------------------------------

  const {
    data: enrollments,
    error: enrollmentsError,
  } = await admin
    .from("program_enrollments")
    .select("learner_id, status")
    .eq("program_id", HELLOGOV_PROGRAM_ID);

  if (enrollmentsError) {
    console.error(
      "Unable to load enrollment statuses:",
      enrollmentsError
    );
  }

  const enrollmentMap = new Map<string, string>();

  for (const enrollment of (enrollments ?? []) as Enrollment[]) {
    enrollmentMap.set(
      enrollment.learner_id,
      enrollment.status
    );
  }

  // ---------------------------------------------------------
  // FETCH LEARNER PROGRESS
  //
  // Uses the same RPC as Trainer > Trainees.
  // ---------------------------------------------------------

  const program = await getTrainerProgram();

  const progressMap = new Map<string, number>();

  let progressErrorMessage: string | null = null;

  if (program) {
    const {
      data: learnerProgress,
      error: progressError,
    } = await supabase.rpc(
      "get_trainer_learners",
      {
        target_program_id: program.id,
      }
    );

    if (progressError) {
      console.error(
        "Unable to load learner progress:",
        progressError
      );

      progressErrorMessage =
        "Some learner progress information is temporarily unavailable.";
    }

    for (const learner of
      (learnerProgress ?? []) as LearnerProgress[]) {
      progressMap.set(
        learner.learner_id,
        Number(learner.progress_percent ?? 0)
      );
    }
  } else {
    progressErrorMessage =
      "The onboarding program could not be found.";
  }

  // ---------------------------------------------------------
  // RESOLVE USER STATUSES
  // ---------------------------------------------------------

  const userStatuses = new Map<string, UserStatus>();

  for (const profile of users) {
    userStatuses.set(
      profile.id,
      getUserStatus({
        role: profile.role,

        lastSignInAt:
          lastSignInMap.get(profile.id) ?? null,

        enrollmentStatus:
          enrollmentMap.get(profile.id) ?? null,

        progressPercent:
          progressMap.get(profile.id) ?? 0,
      })
    );
  }

  // ---------------------------------------------------------
  // PAGE
  // ---------------------------------------------------------

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
                Manage Learning Center access, roles, and team assignments.
              </p>
            </div>

            <AddUserModal />
          </section>

          {/* ERRORS */}

          {error && (
            <div className="mt-6 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-medium text-red-700">
              We couldn&apos;t load the user list.
            </div>
          )}

          {(authUsersError ||
            enrollmentsError ||
            progressErrorMessage) && (
            <div className="mt-6 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-medium text-amber-800">
              {progressErrorMessage ||
                "Some user activity information is temporarily unavailable."}
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

          <TeamAssignments people={users} initial={assignmentRows??[]} />

          {/* USERS */}

          <section className="mt-7 overflow-hidden rounded-[18px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-soft)] px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                  Learning Center access
                </h2>

                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  Select a user to edit their account information,
                  role or Team Lead.
                </p>
              </div>

              <span className="rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)]">
                {users.length}{" "}
                {users.length === 1 ? "account" : "accounts"}
              </span>
            </div>

            {users.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                  No users found
                </p>

                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  Add a trainee or trainer to get started.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left">
                  <thead className="bg-[#FAFBFC]">
                    <tr className="border-b border-[var(--border-soft)]">
                      <TableHeader>User</TableHeader>
                      <TableHeader>Role</TableHeader>
                      <TableHeader>Team Lead</TableHeader>
                      <TableHeader>Status</TableHeader>

                      <th className="px-6 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[var(--border-soft)]">
                    {users.map((profile) => (
                      <tr
                        key={profile.id}
                        className="transition-colors hover:bg-[#FAFCFC]"
                      >
                        {/* USER */}

                        <td className="px-6 py-4">
                          <EditUserModal
                            user={profile}
                            isCurrentUser={
                              profile.id === user.id
                            }
                          />
                        </td>

                        {/* ROLE */}

                        <td className="px-4 py-4">
                          <RoleBadge role={profile.role} />
                        </td>

                        {/* TEAM LEAD */}

                        <td className="px-4 py-4 text-[12px] text-[var(--text-secondary)]">
                          {profile.role === "learner"
                            ? profile.team_lead || "—"
                            : "—"}
                        </td>

                        {/* STATUS */}

                        <td className="px-4 py-4">
                          {profile.account_status === "deactivated" ? (
                            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">Deactivated</span>
                          ) : (
                            <StatusBadge status={userStatuses.get(profile.id) ?? "not_logged_in"} />
                          )}
                        </td>

                        {/* ACTIONS */}

                        <td className="px-6 py-4 text-right">
                          <AccountStatusButton
                            userId={profile.id}
                            userName={
                              profile.full_name ||
                              profile.email ||
                              "this user"
                            }
                            isCurrentUser={profile.id === user.id}
                            accountStatus={profile.account_status}
                          />
                        </td>
                      </tr>
                    ))}
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

// ============================================================
// METRIC
// ============================================================

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

// ============================================================
// TABLE HEADER
// ============================================================

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

// ============================================================
// ROLE BADGE
// ============================================================

function RoleBadge({ role }: { role: string }) {
  const isTrainer = role === "trainer";

  return (
    <span
      className={
        isTrainer
          ? "inline-flex rounded-full bg-[#EEF2F6] px-2.5 py-1 text-[10px] font-semibold text-[#344054]"
          : "inline-flex rounded-full bg-[#EAF8FA] px-2.5 py-1 text-[10px] font-semibold text-[#07879B]"
      }
    >
      {({trainer:"Trainer",learner:"Trainee",observer:"Observer",cross_training:"Cross-Training",team_leader:"Team Leader"} as Record<string,string>)[role] ?? role}
    </span>
  );
}

// ============================================================
// STATUS BADGE
// ============================================================

function StatusBadge({
  status,
}: {
  status: UserStatus;
}) {
  const styles: Record<UserStatus, string> = {
    not_logged_in:
      "bg-amber-50 text-amber-700",

    logged_in:
      "bg-[#EAF8FA] text-[#07879B]",

    in_progress:
      "bg-blue-50 text-blue-700",

    completed:
      "bg-emerald-50 text-emerald-700",
  };

  const labels: Record<UserStatus, string> = {
    not_logged_in: "Not Logged In",
    logged_in: "Logged In",
    in_progress: "In Progress",
    completed: "Completed",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[status]}
    </span>
  );
}