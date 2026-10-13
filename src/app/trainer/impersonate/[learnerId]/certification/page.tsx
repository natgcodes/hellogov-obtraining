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

export default async function ImpersonatedCertificationPage({
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
  // CERTIFICATION
  // ============================================================

  const {
    data: cert,
    error: certError,
  } = await supabase
    .from("certifications")
    .select(`
      id,
      title,
      description,
      passing_score,

      certification_components (
        id,
        title,
        description,
        component_type,
        passing_score,
        position
      )
    `)
    .eq(
      "program_id",
      HELLOGOV_PROGRAM_ID
    )
    .maybeSingle();

  if (certError) {
    console.error(
      "Unable to load certification:",
      certError
    );
  }

  // ============================================================
  // NO CERTIFICATION CONFIGURED
  // ============================================================

  if (!cert) {
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
        <div className="px-5 py-7 sm:px-7 lg:px-8">
          <div className="mx-auto max-w-5xl">
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
                className="inline-flex min-h-9 items-center justify-center rounded-[9px] border border-[#08A9C1]/30 bg-white px-3.5 text-[12px] font-semibold !text-[#07879B]"
              >
                Exit impersonation
              </a>
            </section>

            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
              Certification is not configured yet.
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // ============================================================
  // COMPONENTS
  // ============================================================

  const components = [
    ...(cert.certification_components ??
      []),
  ].sort(
    (a, b) =>
      Number(a.position) -
      Number(b.position)
  );

  const componentIds =
    components.map(
      (component) => component.id
    );

  // ============================================================
  // TRAINEE COMPONENT RESULTS
  // ============================================================

  const {
    data: results,
    error: resultsError,
  } = componentIds.length
    ? await supabase
        .from(
          "certification_component_results"
        )
        .select(`
          component_id,
          status,
          score,
          passed,
          trainer_feedback,
          submitted_at,
          graded_at
        `)
        .eq("learner_id", learnerId)
        .in(
          "component_id",
          componentIds
        )
    : {
        data: [],
        error: null,
      };

  if (resultsError) {
    console.error(
      "Unable to load trainee certification components:",
      resultsError
    );
  }

  const resultMap = new Map(
    (results ?? []).map((result) => [
      result.component_id,
      result,
    ])
  );

  // ============================================================
  // FINAL CERTIFICATION RESULT
  // ============================================================

  const {
    data: finalResult,
    error: finalError,
  } = await supabase
    .from("certification_results")
    .select(`
      status,
      score,
      passed,
      completed_at
    `)
    .eq("certification_id", cert.id)
    .eq("learner_id", learnerId)
    .maybeSingle();

  if (finalError) {
    console.error(
      "Unable to load final certification result:",
      finalError
    );
  }

  // ============================================================
  // HELPERS
  // ============================================================

  function statusLabel(
    status: string | null | undefined
  ) {
    if (!status) {
      return "Not submitted";
    }

    return status
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) =>
        char.toUpperCase()
      );
  }

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

          {/* ===============================================
              IMPERSONATION
          =============================================== */}

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

          {/* ===============================================
              HEADER
          =============================================== */}

          <p className="text-xs font-semibold uppercase tracking-[.18em] text-purple-600">
            Final Assessment
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            {cert.title}
          </h1>

          {cert.description && (
            <p className="mt-2 text-slate-500">
              {cert.description}
            </p>
          )}

          {/* ===============================================
              OVERALL RESULT
          =============================================== */}

          <div className="mt-5 rounded-2xl border border-purple-100 bg-purple-50 p-4 text-sm text-purple-800">
            Overall passing score:{" "}
            {cert.passing_score ?? "—"}%

            {" · "}

            Status:{" "}
            {finalResult?.status
              ? statusLabel(
                  finalResult.status
                )
              : "Not started"}

            {finalResult?.score != null
              ? ` · ${Number(
                  finalResult.score
                ).toFixed(0)}%`
              : ""}
          </div>

          {/* ===============================================
              COMPONENTS
          =============================================== */}

          <div className="mt-6 space-y-4">
            {components.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                No certification components have
                been configured.
              </div>
            ) : (
              components.map(
                (component) => {
                  const result =
                    resultMap.get(
                      component.id
                    );

                  return (
                    <article
                      key={component.id}
                      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                    >
                      <div className="flex flex-wrap justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold uppercase text-slate-400">
                            {component.component_type.replaceAll(
                              "_",
                              " "
                            )}
                          </p>

                          <h2 className="mt-1 text-lg font-semibold text-slate-950">
                            {component.title}
                          </h2>

                          {component.description && (
                            <p className="mt-2 text-sm text-slate-500">
                              {
                                component.description
                              }
                            </p>
                          )}

                          {component.passing_score !=
                            null && (
                            <p className="mt-3 text-xs text-slate-400">
                              Passing score:{" "}
                              {
                                component.passing_score
                              }
                              %
                            </p>
                          )}
                        </div>

                        <div className="text-right text-sm">
                          <b className="text-slate-800">
                            {statusLabel(
                              result?.status
                            )}
                          </b>

                          {result?.score != null && (
                            <div className="mt-1 text-slate-500">
                              {Number(
                                result.score
                              ).toFixed(0)}
                              %
                            </div>
                          )}

                          {result?.passed ===
                            true && (
                            <div className="mt-2 text-xs font-semibold text-emerald-600">
                              Passed
                            </div>
                          )}

                          {result?.passed ===
                            false && (
                            <div className="mt-2 text-xs font-semibold text-red-500">
                              Not passed
                            </div>
                          )}
                        </div>
                      </div>

                      {result?.trainer_feedback && (
                        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                          <b>
                            Trainer feedback:
                          </b>{" "}
                          {
                            result.trainer_feedback
                          }
                        </p>
                      )}

                      {/* READ ONLY INDICATOR */}

                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
                          Read only
                        </span>
                      </div>
                    </article>
                  );
                }
              )
            )}
          </div>
        </main>
      </div>
    </AppShell>
  );
}