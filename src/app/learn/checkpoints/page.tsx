import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import CheckpointSubmitButton from "@/components/learning/CheckpointSubmitButton";
import { createClient } from "@/lib/supabase/server";
import { HELLOGOV_PROGRAM_ID } from "@/lib/program/constants";

export default async function LearnerCheckpointsPage() {
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
  // PROFILE
  // ---------------------------------------------------------

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role === "trainer") {
    redirect("/trainer");
  }

  // ---------------------------------------------------------
  // LEARNING ROLE
  // ---------------------------------------------------------

  const allowedLearningRoles = [
    "learner",
    "observer",
    "cross_training",
    "team_leader",
    "executive",
  ] as const;

  type LearningRole =
    (typeof allowedLearningRoles)[number];

  const learningRole: LearningRole =
    allowedLearningRoles.includes(
      profile.role as LearningRole
    )
      ? (profile.role as LearningRole)
      : "learner";

  // ---------------------------------------------------------
  // PUBLISHED DAYS + CHECKPOINTS
  // ---------------------------------------------------------

  const { data: days } = await supabase
    .from("days")
    .select(
      `
      id,
      day_number,
      title,
      position,
      checkpoints (
        id,
        title,
        description,
        checkpoint_type,
        passing_score,
        position
      )
    `
    )
    .eq("program_id", HELLOGOV_PROGRAM_ID)
    .eq("is_published", true)
    .order("position");

  const checkpointIds = (days ?? []).flatMap(
    (day: any) =>
      (day.checkpoints ?? []).map(
        (checkpoint: any) => checkpoint.id
      )
  );

  // ---------------------------------------------------------
  // CHECKPOINT RESULTS
  // ---------------------------------------------------------

  const { data: results } = checkpointIds.length
    ? await supabase
        .from("checkpoint_results")
        .select(
          "checkpoint_id,status,score,passed,trainer_feedback,submitted_at,graded_at"
        )
        .eq("learner_id", user.id)
        .in("checkpoint_id", checkpointIds)
    : { data: [] };

  const byId = new Map(
    (results ?? []).map((result: any) => [
      result.checkpoint_id,
      result,
    ])
  );

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <AppShell
      role={learningRole}
      userName={profile.full_name}
      userEmail={profile.email}
    >
      <main className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#e84545]">
          Evaluations
        </p>

        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          Checkpoints
        </h1>

        <p className="mt-2 text-slate-500">
          Complete the required knowledge checks,
          practical exercises and mock-call
          checkpoints throughout onboarding.
        </p>

        <div className="mt-8 space-y-8">
          {(days ?? []).map((day: any) => {
            const checkpoints = [
              ...(day.checkpoints ?? []),
            ].sort(
              (a: any, b: any) =>
                a.position - b.position
            );

            if (!checkpoints.length) {
              return null;
            }

            return (
              <section key={day.id}>
                <h2 className="mb-3 text-lg font-semibold text-slate-900">
                  Day {day.day_number} · {day.title}
                </h2>

                <div className="space-y-3">
                  {checkpoints.map(
                    (checkpoint: any) => {
                      const result: any = byId.get(
                        checkpoint.id
                      );

                      return (
                        <article
                          key={checkpoint.id}
                          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                        >
                          <div className="flex flex-wrap justify-between gap-4">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                                {checkpoint.checkpoint_type.replaceAll(
                                  "_",
                                  " "
                                )}
                              </p>

                              <h3 className="mt-1 font-semibold text-slate-950">
                                {checkpoint.title}
                              </h3>

                              {checkpoint.description && (
                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                  {
                                    checkpoint.description
                                  }
                                </p>
                              )}
                            </div>

                            <div className="text-right text-sm">
                              <div className="font-semibold text-slate-700">
                                {result?.status?.replaceAll(
                                  "_",
                                  " "
                                ) ?? "Not submitted"}
                              </div>

                              {result?.score != null && (
                                <div className="mt-1 text-slate-500">
                                  Score:{" "}
                                  {Number(
                                    result.score
                                  ).toFixed(0)}
                                  %
                                </div>
                              )}
                            </div>
                          </div>

                          {result?.trainer_feedback && (
                            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                              <b>Trainer feedback:</b>{" "}
                              {
                                result.trainer_feedback
                              }
                            </div>
                          )}

                          <CheckpointSubmitButton
                            checkpointId={
                              checkpoint.id
                            }
                            submitted={Boolean(
                              result
                            )}
                          />
                        </article>
                      );
                    }
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </AppShell>
  );
}