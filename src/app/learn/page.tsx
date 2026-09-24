import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import SetupChecklist from "@/components/learning/SetupChecklist";
import LearnerDayCard from "@/components/learning/LearnerDayCard";
import LearnerProgressBar from "@/components/learning/LearnerProgressBar";
import { createClient } from "@/lib/supabase/server";
import { getLearnerProgram } from "@/lib/learning/getLearnerProgram";
import { getLearnerProgress } from "@/lib/learning/getLearnerProgress";

export default async function LearnPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "trainer") {
    redirect("/trainer");
  }

  const program = await getLearnerProgram();

  if (!program) {
    return (
      <AppShell role="learner">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h1 className="text-2xl font-semibold text-slate-950">
              Training is not available yet
            </h1>

            <p className="mt-2 text-slate-500">
              Your onboarding program has not been published.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  await supabase.rpc("ensure_program_enrollment", {
    target_program_id: program.id,
  });

  const progress = await getLearnerProgress(program.id);

  const dayStates = await Promise.all(
    program.days.map(async (day) => {
      const [unlockResult, completeResult] =
        await Promise.all([
          supabase.rpc("is_day_unlocked", {
            target_day_id: day.id,
          }),

          supabase.rpc("is_day_complete", {
            target_day_id: day.id,
          }),
        ]);

      return {
        day,
        unlocked: Boolean(unlockResult.data),
        completed: Boolean(completeResult.data),
      };
    })
  );

  return (
    <AppShell role="learner">
      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e84545]">
            HelloGov Learning Center
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {program.title}
          </h1>

          {program.description && (
            <p className="mt-3 max-w-3xl leading-7 text-slate-500">
              {program.description}
            </p>
          )}

          <div className="mt-7">
            <LearnerProgressBar value={progress.percent} />
          </div>
        </section>

        {program.setup_items.length > 0 && (
          <div className="mt-6">
            <SetupChecklist
              items={program.setup_items}
              progress={progress.setup}
            />
          </div>
        )}

        <section className="mt-10">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Your onboarding
            </p>

            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              Training Days
            </h2>
          </div>

          <div className="space-y-4">
            {dayStates.map(
              ({ day, unlocked, completed }) => (
                <LearnerDayCard
                  key={day.id}
                  day={day}
                  unlocked={unlocked}
                  completed={completed}
                />
              )
            )}
          </div>
        </section>
      </main>
    </AppShell>
  );
}