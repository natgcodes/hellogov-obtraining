import { redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import ProgramPublishControl from "@/components/trainer/ProgramPublishControl";
import ProgramTimeline from "@/components/trainer/ProgramTimeline";
import { HELLOGOV_PROGRAM_ID } from "@/lib/program/constants";
import { getDays } from "@/lib/program/getDays";
import { getProgramSections } from "@/lib/program/getProgramSections";
import { createClient } from "@/lib/supabase/server";

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

  const {
    data: program,
    error: programError,
  } = await supabase
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
        <div className="px-5 py-7 sm:px-7 lg:px-8 lg:py-8">
          <main className="mx-auto w-full max-w-[1440px]">
            <div className="rounded-[18px] border border-red-200 bg-red-50 p-6">
              <h1 className="text-[16px] font-semibold text-red-800">
                Program not found
              </h1>

              <p className="mt-2 text-[13px] text-red-600">
                The onboarding program could not be loaded.
              </p>
            </div>
          </main>
        </div>
      </AppShell>
    );
  }

  const [days, sections, setupSectionResponse] =
    await Promise.all([
      getDays(),
      getProgramSections(),

      supabase
        .from("setup_sections")
        .select(
          "id, program_id, title, description, instructions"
        )
        .eq("program_id", HELLOGOV_PROGRAM_ID)
        .maybeSingle(),
    ]);

  if (setupSectionResponse.error) {
    console.error(
      "Unable to load Tool Setup section:",
      setupSectionResponse.error
    );
  }

  const setupSection =
    setupSectionResponse.data ?? {
      id: "",
      program_id: HELLOGOV_PROGRAM_ID,
      title: "Tool Setup",
      description:
        "Define everything trainees need before onboarding begins.",
      instructions: null,
    };

  const totalModules = days.reduce(
    (total, day) => total + day.modules.length,
    0
  );

  const publishedDays = days.filter(
    (day) => day.is_published
  ).length;

  const isPublished =
    program.status === "published";

  return (
    <AppShell
      role="trainer"
      userName={profile.full_name}
      userEmail={profile.email}
    >
      <div className="px-5 py-7 sm:px-7 lg:px-8 lg:py-8">
        <main className="mx-auto w-full max-w-[1440px]">
          {/* HEADER */}

          <section>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--teal)]">
              Program Builder
            </p>

            <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.035em] text-[var(--text-primary)] sm:text-[30px]">
              {program.title}
            </h1>

            <p className="mt-2 max-w-3xl text-[14px] leading-6 text-[var(--text-secondary)]">
              {program.description ||
                "Build, organize and manage the complete trainee onboarding experience."}
            </p>
          </section>

          {/* PROGRAM SUMMARY */}

          <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[16px] border border-[var(--border)] bg-white px-5 py-4 shadow-[var(--shadow-xs)]">
              <p className="text-[11px] font-medium text-[var(--text-secondary)]">
                Training days
              </p>

              <p className="mt-1 text-[24px] font-semibold tracking-[-0.035em] text-[var(--text-primary)]">
                {days.length}
              </p>
            </div>

            <div className="rounded-[16px] border border-[var(--border)] bg-white px-5 py-4 shadow-[var(--shadow-xs)]">
              <p className="text-[11px] font-medium text-[var(--text-secondary)]">
                Learning modules
              </p>

              <p className="mt-1 text-[24px] font-semibold tracking-[-0.035em] text-[var(--text-primary)]">
                {totalModules}
              </p>
            </div>

            <div className="rounded-[16px] border border-[var(--border)] bg-white px-5 py-4 shadow-[var(--shadow-xs)]">
              <p className="text-[11px] font-medium text-[var(--text-secondary)]">
                Published days
              </p>

              <p className="mt-1 text-[24px] font-semibold tracking-[-0.035em] text-[var(--text-primary)]">
                {publishedDays}/{days.length}
              </p>
            </div>

            <div className="rounded-[16px] border border-[var(--border)] bg-white px-5 py-4 shadow-[var(--shadow-xs)]">
              <p className="text-[11px] font-medium text-[var(--text-secondary)]">
                Program status
              </p>

              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isPublished
                      ? "bg-emerald-500"
                      : "bg-slate-400"
                  }`}
                />

                <span
                  className={`text-[13px] font-semibold ${
                    isPublished
                      ? "text-emerald-700"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  {isPublished ? "Published" : "Draft"}
                </span>
              </div>
            </div>
          </section>

          {/* MAIN BUILDER */}

          <div className="mt-7 grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0">
              <ProgramTimeline
                days={days}
                setupItems={sections.setupItems}
                setupSection={setupSection}
                certification={sections.certification}
                postTraining={sections.postTraining}
              />
            </div>

            <aside className="grid h-fit gap-4 sm:grid-cols-2 2xl:sticky 2xl:top-[calc(var(--topbar-height)+24px)] 2xl:grid-cols-1">
              <ProgramPublishControl
                programId={program.id}
                status={program.status}
              />

              <div className="rounded-[16px] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-xs)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Visibility
                </p>

                <p className="mt-3 text-[12px] leading-5 text-[var(--text-secondary)]">
                  {isPublished
                    ? "This program is published and currently available to trainees. Changes are stored in the shared training database."
                    : "This program is currently in draft. Trainees cannot access it until it is published."}
                </p>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </AppShell>
  );
}