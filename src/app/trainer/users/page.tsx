import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import AddUserModal from "@/components/trainer/AddUserModal";
import DeleteUserButton from "@/components/trainer/DeleteUserButton";
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

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (currentProfile?.role !== "trainer") {
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
    (profile) => profile.role === "trainer"
  );

  const trainees = users.filter(
    (profile) => profile.role === "learner"
  );

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <AppShell role="trainer">
      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* HEADER */}

        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e84545]">
              Training Operations
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              User Management
            </h1>

            <p className="mt-2 max-w-2xl text-slate-500">
              Manage access to the HelloGov Learning
              Center for trainees and trainers.
            </p>
          </div>

          <AddUserModal />
        </div>

        {/* ERROR */}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            We couldn&apos;t load the user list.
          </div>
        )}

        {/* METRICS */}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Metric
            label="Total users"
            value={users.length}
          />

          <Metric
            label="Trainees"
            value={trainees.length}
          />

          <Metric
            label="Trainers"
            value={trainers.length}
          />
        </div>

        {/* USERS */}

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="font-semibold text-slate-950">
              Learning Center access
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Accounts authorized to access the
              HelloGov Learning Center.
            </p>
          </div>

          {users.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No users found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-3">
                      User
                    </th>

                    <th className="px-4 py-3">
                      Role
                    </th>

                    <th className="px-4 py-3">
                      Team Lead
                    </th>

                    <th className="px-6 py-3">
                      Access
                    </th>

                    <th className="px-6 py-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {users.map((profile) => (
                    <tr
                      key={profile.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                            {getInitials(
                              profile.full_name,
                              profile.email
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="font-medium text-slate-900">
                              {profile.full_name ||
                                "Unnamed user"}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-500">
                              {profile.email ||
                                "No email available"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <RoleBadge
                          role={profile.role}
                        />
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {profile.role === "learner"
                          ? profile.team_lead || "—"
                          : "—"}
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          Active
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <DeleteUserButton
                          userId={profile.id}
                          userName={
                            profile.full_name ||
                            profile.email ||
                            "this user"
                          }
                          isCurrentUser={
                            profile.id === user.id
                          }
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
    </AppShell>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
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
          ? "inline-flex rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700"
          : "inline-flex rounded-full bg-[#e84545]/10 px-2.5 py-1 text-xs font-semibold text-[#e84545]"
      }
    >
      {isTrainer ? "Trainer" : "Trainee"}
    </span>
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