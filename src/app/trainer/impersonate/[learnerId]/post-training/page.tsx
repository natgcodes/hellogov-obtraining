import { notFound, redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";
import { HELLOGOV_PROGRAM_ID } from "@/lib/program/constants";
import { getImpersonatedLearnerJourney } from "@/lib/trainer/getImpersonatedLearner";

type Props = {
  params: Promise<{
    learnerId: string;
  }>;
};

export default async function ImpersonatedPostTrainingPage({
  params,
}: Props) {
  const { learnerId } = await params;
  const supabase = await createClient();

  // ============================================================
  // AUTH
  // ============================================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ============================================================
  // TRAINER SECURITY
  // ============================================================

  const {
    data: trainerProfile,
    error: trainerError,
  } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  if (
    trainerError ||
    !trainerProfile ||
    trainerProfile.role !== "trainer"
  ) {
    redirect("/learn");
  }

  // ============================================================
  // TARGET TRAINEE
  // ============================================================

  const {
    data: trainee,
    error: traineeError,
  } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", learnerId)
    .single();

  if (
    traineeError ||
    !trainee ||
    trainee.role === "trainer"
  ) {
    notFound();
  }

  const traineeName =
    trainee.full_name?.trim() ||
    trainee.email ||
    "Trainee";

  // ============================================================
  // JOURNEY
  // ============================================================

  const journey =
    await getImpersonatedLearnerJourney(
      learnerId
    );

  // ============================================================
  // POST-TRAINING CONTENT
  // ============================================================

  const {
    data: post,
    error: postError,
  } = await supabase
    .from("post_training")
    .select(`
      id,
      title,
      description,
      disclaimer,

      post_training_stages (
        id,
        title,
        description,
        position
      )
    `)
    .eq(
      "program_id",
      HELLOGOV_PROGRAM_ID
    )
    .maybeSingle();

  if (postError) {
    console.error(
      "Unable to load post-training content:",
      postError
    );
  }

  const stages = [
    ...(post?.post_training_stages ?? []),
  ].sort(
    (a, b) =>
      Number(a.position) -
      Number(b.position)
  );

  // ============================================================
  // UI
  // ============================================================

  return (
    <AppShell
      role="trainer"
      userName={trainerProfile.full_name}
      userEmail={trainerProfile.email}
      learnerJourney={journey}
      impersonation={{
        learnerId,
        learnerName: traineeName,
        learnerEmail: trainee.email,
      }}
    >
      <div className="px-5 py-7 sm:px-7 lg:px-8 lg:py-8">
        <main className="mx-auto max-w-5xl">

          {/* =================================================
              IMPERSONATION BANNER
          ================================================= */}

          <section className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-[16px] border border-[#08A9C1]/20 bg-[#EAF8FA] px-5 py-4">
            <div>
              <p className="text-[12px] font-semibold text-[#07879B]">
                Impersonating {traineeName}
              </p>

              <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                Read-only trainee preview
              </p>
            </div>

            <a
              href={`/trainer/learners/${learnerId}`}
              className="inline-flex min-h-9 items-center justify-center rounded-[9px] border border-[#08A9C1]/30 bg-white px-3.5 text-[12px] font-semibold !text-[#07879B] transition hover:bg-[#F5FCFD]"
            >
              Exit impersonation
            </a>
          </section>

          {/* =================================================
              HEADER
          ================================================= */}

          <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#e84545]">
            After Onboarding
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            {post?.title ?? "Post-Training"}
          </h1>

          {post?.description && (
            <p className="mt-2 max-w-3xl text-slate-500">
              {post.description}
            </p>
          )}

          {/* =================================================
              STAGES
          ================================================= */}

          <div className="mt-8 space-y-3">
            {stages.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
                <h2 className="text-sm font-semibold text-slate-800">
                  No next steps configured
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Post-training stages have not
                  been added yet.
                </p>
              </div>
            ) : (
              stages.map((stage, index) => (
                <div
                  key={stage.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold">
                      {index + 1}
                    </span>

                    <div>
                      <h2 className="font-semibold text-slate-950">
                        {stage.title}
                      </h2>

                      {stage.description && (
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {stage.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* =================================================
              DISCLAIMER
          ================================================= */}

          {post?.disclaimer && (
            <p className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
              {post.disclaimer}
            </p>
          )}
        </main>
      </div>
    </AppShell>
  );
}