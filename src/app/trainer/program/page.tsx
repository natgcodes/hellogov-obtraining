import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDays } from "@/lib/program/getDays";
import { getProgramSections } from "@/lib/program/getProgramSections";
import AppShell from "@/components/layout/AppShell";
import ProgramTimeline from "@/components/trainer/ProgramTimeline";
import ProgramPublishControl from "@/components/trainer/ProgramPublishControl";
import { HELLOGOV_PROGRAM_ID } from "@/lib/program/constants";

export default async function TrainerProgramPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "trainer") {
    redirect("/learn");
  }

  const { data: program, error: programError } = await supabase
    .from("programs")
    .select("id, title, description, status")
    .eq("id", HELLOGOV_PROGRAM_ID)
    .single();

  if (programError || !program) {
    return (
      <AppShell
        role="trainer"
        userName={profile.full_name}
        userEmail={profile.email}
      >
        <div className="rounded-[20px] border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-semibold text-red-800">
            Program not found
          </h1>

          <p className="mt-2 text-sm text-red-600">
            The onboarding program could not be loaded.
          </p>
        </div>
      </AppShell>
    );
  }

  const [days, sections] = await Promise.all([
    getDays(),
    getProgramSections(),
  ]);

  const totalModules = days.reduce(
    (total, day) => total + day.modules.length,
    0
  );

  return (
    <AppShell
      role="trainer"
      userName={profile.full_name}
      userEmail={profile.email}
    >
      <div>
        <p className="mb-2 text-sm font-medium text-[#e84545]">
          Program Builder
        </p>

        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#172033]">
          {program.title}
        </h1>

        <p className="mt-2 max-w-3xl text-[15px] leading-6 text-[#667085]">
          {program.description ||
            "Build, organize and manage the complete learner onboarding experience."}
        </p>
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <ProgramTimeline
          days={days}
          setupItems={sections.setupItems}
          certification={sections.certification}
          postTraining={sections.postTraining}
        />

        <aside className="h-fit space-y-5">
          <ProgramPublishControl
            programId={program.id}
            status={program.status}
          />

          <div className="rounded-[20px] border border-[#e5e7eb] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
              Program overview
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <div className="text-2xl font-semibold tracking-tight text-[#172033]">
                  {days.length}
                </div>

                <div className="text-xs text-[#98a2b3]">
                  Training days
                </div>
              </div>

              <div className="h-px bg-[#eef0f3]" />

              <div>
                <div className="text-2xl font-semibold tracking-tight text-[#172033]">
                  {totalModules}
                </div>

                <div className="text-xs text-[#98a2b3]">
                  Learning modules
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[20px] border border-[#e5e7eb] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
              Visibility
            </p>

            <p className="mt-3 text-xs leading-5 text-[#667085]">
              {program.status === "published"
                ? "This program is currently published and available to learners. Changes made to the program are stored in the shared training database."
                : "This program is currently in draft. Learners will not be able to access it until it is published."}
            </p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}