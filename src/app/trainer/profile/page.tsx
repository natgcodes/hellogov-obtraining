import { redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import TrainerProfileForm from "@/components/trainer/TrainerProfileForm";
import { createClient } from "@/lib/supabase/server";

export default async function TrainerProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    redirect("/login");
  }

  if (profile.role !== "trainer") {
    redirect("/learn");
  }

  const fullName =
    profile.full_name?.trim() ||
    user.user_metadata?.full_name?.trim() ||
    "Trainer";

  const email =
    profile.email?.trim() ||
    user.email?.trim() ||
    "";

  return (
    <AppShell
      role="trainer"
      userName={fullName}
      userEmail={email}
    >
      <div className="px-5 py-7 sm:px-7 lg:px-8 lg:py-8">
        <main className="mx-auto w-full max-w-[760px]">
          {/* PAGE HEADER */}

          <div className="mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#07879B]">
              Account
            </p>

            <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.035em] text-[#172033]">
              My Profile
            </h1>

            <p className="mt-1.5 text-[13px] leading-5 text-[#667085]">
              Manage your personal trainer account information.
            </p>
          </div>

          {/* PROFILE SUMMARY */}

          <section className="mb-4 rounded-[18px] border border-[#E4E7EC] bg-white px-5 py-5 shadow-[var(--shadow-xs)] sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EAF8FA] text-[14px] font-semibold text-[#07879B]">
                  {getInitials(fullName)}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-[15px] font-semibold text-[#172033]">
                      {fullName}
                    </h2>

                    <span className="inline-flex rounded-full bg-[#EAF8FA] px-2.5 py-1 text-[10px] font-semibold text-[#07879B]">
                      Trainer
                    </span>
                  </div>

                  {email && (
                    <p className="mt-1 truncate text-[12px] text-[#98A2B3]">
                      {email}
                    </p>
                  )}
                </div>
              </div>

              <p className="max-w-[260px] text-[10px] leading-4 text-[#98A2B3] sm:text-right">
                Your trainer role is protected and cannot be changed
                from your own profile.
              </p>
            </div>
          </section>

          {/* EDIT FORM */}

          <TrainerProfileForm
            userId={user.id}
            initialFullName={fullName}
            initialEmail={email}
          />
        </main>
      </div>
    </AppShell>
  );
}

function getInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "T";
}