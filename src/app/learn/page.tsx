import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import SetupChecklist from "@/components/learning/SetupChecklist";
import LearnerProgressBar from "@/components/learning/LearnerProgressBar";
import { createClient } from "@/lib/supabase/server";
import { getLearnerProgram } from "@/lib/learning/getLearnerProgram";
import { getLearnerProgress } from "@/lib/learning/getLearnerProgress";
import { getLearnerJourney } from "@/lib/learning/getLearnerJourney";

export default async function LearnPage() {
  // ---------------------------------------------------------
  // PERFORMANCE
  // ---------------------------------------------------------

  const totalStart = performance.now();

  function logPerf(label: string, start: number) {
    console.log(
      `[LEARN PERF] ${label}: ${Math.round(
        performance.now() - start
      )}ms`
    );
  }

  const timed = async <T,>(
    label: string,
    promise: PromiseLike<T>
  ): Promise<T> => {
    const start = performance.now();

    const result = await promise;

    logPerf(label, start);

    return result;
  };

  const supabase = await createClient();

  // ---------------------------------------------------------
  // AUTH
  // ---------------------------------------------------------

  const authStart = performance.now();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  logPerf("auth.getUser", authStart);

  if (authError) {
    console.error(
      "Unable to load learner session:",
      authError
    );
  }

  if (!user) {
    redirect("/login");
  }

  // ---------------------------------------------------------
  // PROFILE + PROGRAM
  // ---------------------------------------------------------

  const profileProgramStart = performance.now();

  const [profileResult, program] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", user.id)
        .single(),

      getLearnerProgram(),
    ]);

  logPerf(
    "profile + program",
    profileProgramStart
  );

  const {
    data: profile,
    error: profileError,
  } = profileResult;

  if (profileError || !profile) {
    console.error(
      "Unable to load learner profile:",
      profileError
    );

    redirect("/login");
  }

  if (profile.role === "trainer") {
    redirect("/trainer");
  }

  // ---------------------------------------------------------
  // NO PUBLISHED PROGRAM
  // ---------------------------------------------------------

  if (!program) {
    logPerf(
      "TOTAL LearnPage",
      totalStart
    );

    return (
      <AppShell
        role="learner"
        userName={profile.full_name}
        userEmail={profile.email}
      >
        <div className="px-5 py-8 sm:px-7 lg:px-8">
          <div className="mx-auto max-w-[1180px]">
            <div className="rounded-[16px] border border-[var(--border)] bg-white p-10 text-center shadow-[var(--shadow-xs)]">
              <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
                Training is not available yet
              </h1>

              <p className="mt-2 text-[14px] text-[var(--text-secondary)]">
                Your onboarding program has not
                been published.
              </p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // ---------------------------------------------------------
  // PROGRESS + JOURNEY
  //
  // IMPORTANT:
  // Both functions receive the authenticated learner ID.
  // This avoids another auth.getUser() inside the helpers.
  // ---------------------------------------------------------

  const progressStart = performance.now();

  const [progress, learnerJourney] =
    await Promise.all([
      timed(
        "getLearnerProgress",
        getLearnerProgress(
          program.id,
          user.id
        )
      ),

      timed(
        "getLearnerJourney",
        getLearnerJourney(user.id)
      ),
    ]);

  logPerf(
    "progress + journey TOTAL",
    progressStart
  );

  // ---------------------------------------------------------
  // DAY STATES
  // ---------------------------------------------------------

  const journeyDaysById = new Map(
    (learnerJourney?.days ?? []).map(
      (day) => [day.id, day]
    )
  );

  const dayStates = program.days.map(
    (day) => {
      const journeyDay =
        journeyDaysById.get(day.id);

      return {
        day,

        unlocked:
          journeyDay?.unlocked ?? false,

        completed:
          journeyDay?.completed ?? false,
      };
    }
  );

  // ---------------------------------------------------------
  // DERIVED OVERVIEW STATE
  // ---------------------------------------------------------

  const requiredSetupItems =
  program.setup_items.filter(
    (item) => item.is_required
  );

const setupTotal =
  requiredSetupItems.length;

const setupCompleted =
  requiredSetupItems.filter(
    (item) =>
      progress.setup[item.id] === true
  ).length;

const setupIsComplete =
  setupTotal === 0 ||
  setupCompleted >= setupTotal;

const learnerJourneyWithSetup =
  learnerJourney
    ? {
        ...learnerJourney,
        setupCompleted,
        setupTotal,
      }
    : undefined;


  const completedDays =
    dayStates.filter(
      ({ completed }) => completed
    ).length;

  const totalDays = dayStates.length;

  const currentDayState =
    dayStates.find(
      ({ unlocked, completed }) =>
        unlocked && !completed
    ) ?? null;

  const allDaysComplete =
    totalDays > 0 &&
    completedDays === totalDays;

  const firstName =
    profile.full_name
      ?.trim()
      .split(/\s+/)[0] || "there";

  const currentDayModuleCount =
    currentDayState?.day.modules.length ??
    0;

  const currentDayMinutes =
    currentDayState?.day.modules.reduce(
      (total, module) =>
        total +
        (module.duration_minutes ?? 0),
      0
    ) ?? 0;

  const remainingDays = Math.max(
    totalDays - completedDays,
    0
  );

  // ---------------------------------------------------------
  // FINAL PERFORMANCE
  // ---------------------------------------------------------

  logPerf(
    "TOTAL LearnPage",
    totalStart
  );

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <AppShell
  role="learner"
  userName={profile.full_name}
  userEmail={profile.email}
  learnerJourney={learnerJourneyWithSetup}
>
      <div className="px-5 py-7 sm:px-7 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[1180px]">
          {/* =================================================
              PAGE INTRO
          ================================================= */}

          <section>
            <p className="text-[12px] font-medium text-[var(--text-muted)]">
              HelloGov Learning Center
            </p>

            <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.035em] text-[var(--text-primary)] sm:text-[30px]">
              Welcome back, {firstName}
            </h1>

            <p className="mt-2 max-w-[680px] text-[14px] leading-6 text-[var(--text-secondary)]">
              Continue your onboarding and keep
              moving through your training journey.
            </p>
          </section>

          {/* =================================================
              TOP OVERVIEW
          ================================================= */}

          <section className="mt-7 grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
            {/* CONTINUE LEARNING */}

            <div className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
              <div className="border-b border-[var(--border-soft)] px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
                      Continue Learning
                    </p>

                    <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                      {currentDayState
                        ? `Day ${currentDayState.day.day_number}: ${currentDayState.day.title}`
                        : allDaysComplete
                          ? "Training complete"
                          : "Ready to begin"}
                    </h2>
                  </div>

                  {currentDayState && (
                    <span className="rounded-full bg-[var(--teal-soft)] px-3 py-1.5 text-[11px] font-semibold text-[var(--teal-deep)]">
                      Current day
                    </span>
                  )}
                </div>
              </div>

              <div className="px-5 py-5 sm:px-6">
                {currentDayState ? (
                  <>
                    {currentDayState.day
                      .description && (
                      <p className="max-w-[720px] text-[13px] leading-6 text-[var(--text-secondary)]">
                        {
                          currentDayState.day
                            .description
                        }
                      </p>
                    )}

                    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-[var(--text-muted)]">
                      <span>
                        {currentDayModuleCount}{" "}
                        {currentDayModuleCount === 1
                          ? "module"
                          : "modules"}
                      </span>

                      {currentDayMinutes > 0 && (
                        <>
                          <span
                            className="h-1 w-1 rounded-full bg-[var(--border)]"
                            aria-hidden="true"
                          />

                          <span>
                            Approx.{" "}
                            {currentDayMinutes} min
                          </span>
                        </>
                      )}

                      <span
                        className="h-1 w-1 rounded-full bg-[var(--border)]"
                        aria-hidden="true"
                      />

                      <span>
                        {remainingDays}{" "}
                        {remainingDays === 1
                          ? "day"
                          : "days"}{" "}
                        remaining
                      </span>
                    </div>

                    <div className="mt-5">
                      <Link
                        href={`/learn/day/${currentDayState.day.id}`}
                        prefetch
                        className="inline-flex min-h-10 items-center justify-center rounded-[10px] bg-[var(--teal)] px-4 text-[13px] font-semibold text-white transition hover:bg-[var(--teal-deep)]"
                      >
                        Continue training

                        <span
                          className="ml-2"
                          aria-hidden="true"
                        >
                          →
                        </span>
                      </Link>
                    </div>
                  </>
                ) : allDaysComplete ? (
                  <>
                    <p className="max-w-[680px] text-[13px] leading-6 text-[var(--text-secondary)]">
                      You&apos;ve completed all
                      published training days. Your
                      onboarding content remains
                      available for review.
                    </p>

                    {learnerJourney?.certificationUnlocked && (
                      <div className="mt-5">
                        <Link
                          href="/learn/certification"
                          prefetch
                          className="inline-flex min-h-10 items-center justify-center rounded-[10px] bg-[var(--teal)] px-4 text-[13px] font-semibold text-white transition hover:bg-[var(--teal-deep)]"
                        >
                          View certification

                          <span
                            className="ml-2"
                            aria-hidden="true"
                          >
                            →
                          </span>
                        </Link>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="max-w-[680px] text-[13px] leading-6 text-[var(--text-secondary)]">
                      Your training journey is
                      ready. You can begin with the
                      first available training day.
                    </p>

                    <div className="mt-4 flex items-center gap-2 text-[12px] font-medium text-[var(--text-secondary)]">
                      <span className="text-[var(--teal)]">
                        {setupCompleted}
                      </span>

                      <span>
                        of {setupTotal} setup items
                        completed
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* OVERALL PROGRESS */}

            <div className="rounded-[16px] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-xs)] sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Overall Progress
                  </p>

                  <p className="mt-2 text-[32px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                    {Math.round(
                      progress.percent
                    )}
                    %
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-[var(--teal-soft)] text-[16px] font-semibold text-[var(--teal)]">
                  ↗
                </div>
              </div>

              <div className="mt-4">
                <LearnerProgressBar
                  value={progress.percent}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--border-soft)] pt-4">
                <div>
                  <p className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                    {completedDays}/{totalDays}
                  </p>

                  <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                    Days completed
                  </p>
                </div>

                <div>
                  <p className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                    {setupCompleted}/{setupTotal}
                  </p>

                  <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                    Setup complete
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              SETUP
          ================================================= */}

          {program.setup_items.length > 0 && (
            <section className="mt-8">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Getting Started
                  </p>

                  <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
                    Before Day 1
                  </h2>
                </div>

                <span
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                    setupIsComplete
                      ? "bg-[var(--success-soft)] text-[var(--success)]"
                      : "bg-[var(--surface-muted)] text-[var(--text-secondary)]"
                  }`}
                >
                  {setupIsComplete
                    ? "Setup complete"
                    : `${setupCompleted}/${setupTotal} complete`}
                </span>
              </div>

              <SetupChecklist
                items={program.setup_items}
                progress={progress.setup}
                programId={program.id}
              />
            </section>
          )}

          {/* =================================================
              TRAINING JOURNEY
          ================================================= */}

          <section className="mt-9">
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Your Onboarding
              </p>

              <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
                Training Journey
              </h2>

              <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                Complete each day to unlock the
                next stage of your onboarding.
              </p>
            </div>

            <div className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
              {dayStates.map(
                (
                  {
                    day,
                    unlocked,
                    completed,
                  },
                  index
                ) => {
                  const accessible =
                    unlocked || completed;

                  const isCurrent =
                    currentDayState?.day.id ===
                    day.id;

                  const moduleCount =
                    day.modules.length;

                  const totalMinutes =
                    day.modules.reduce(
                      (total, module) =>
                        total +
                        (module.duration_minutes ??
                          0),
                      0
                    );

                  return (
                    <div
                      key={day.id}
                      className={`relative flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-6 ${
                        index !== 0
                          ? "border-t border-[var(--border-soft)]"
                          : ""
                      } ${
                        isCurrent
                          ? "bg-[var(--teal-soft)]/40"
                          : ""
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-4">
                        <div className="relative flex shrink-0 flex-col items-center">
                          <div
                            className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border text-[12px] font-semibold ${
                              completed
                                ? "border-[var(--success)] bg-[var(--success)] text-white"
                                : isCurrent
                                  ? "border-[var(--teal)] bg-[var(--teal)] text-white"
                                  : accessible
                                    ? "border-[var(--teal)] bg-white text-[var(--teal)]"
                                    : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-muted)]"
                            }`}
                          >
                            {completed
                              ? "✓"
                              : day.day_number}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p
                              className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${
                                isCurrent
                                  ? "text-[var(--teal)]"
                                  : "text-[var(--text-muted)]"
                              }`}
                            >
                              Day {day.day_number}
                            </p>

                            {isCurrent && (
                              <span className="rounded-full bg-[var(--teal-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--teal-deep)]">
                                Current
                              </span>
                            )}

                            {completed && (
                              <span className="rounded-full bg-[var(--success-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--success)]">
                                Completed
                              </span>
                            )}

                            {!accessible && (
                              <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                                Locked
                              </span>
                            )}
                          </div>

                          <h3
                            className={`mt-1 text-[15px] font-semibold ${
                              accessible
                                ? "text-[var(--text-primary)]"
                                : "text-[var(--text-muted)]"
                            }`}
                          >
                            {day.title}
                          </h3>

                          {day.description && (
                            <p
                              className={`mt-1 max-w-[680px] text-[12px] leading-5 ${
                                accessible
                                  ? "text-[var(--text-secondary)]"
                                  : "text-[var(--text-muted)]"
                              }`}
                            >
                              {day.description}
                            </p>
                          )}

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]">
                            <span>
                              {moduleCount}{" "}
                              {moduleCount === 1
                                ? "module"
                                : "modules"}
                            </span>

                            {totalMinutes > 0 && (
                              <>
                                <span
                                  className="h-1 w-1 rounded-full bg-[var(--border)]"
                                  aria-hidden="true"
                                />

                                <span>
                                  {totalMinutes} min
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 pl-[52px] sm:pl-0">
                        {accessible ? (
                          <Link
                            href={`/learn/day/${day.id}`}
                            prefetch
                            className={`inline-flex min-h-9 items-center justify-center rounded-[9px] px-3.5 text-[12px] font-semibold transition ${
                              isCurrent
                                ? "bg-[var(--teal)] text-white hover:bg-[var(--teal-deep)]"
                                : "border border-[var(--border)] bg-white text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
                            }`}
                          >
                            {completed
                              ? "Review"
                              : isCurrent
                                ? "Continue"
                                : "Open"}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
                            <span aria-hidden="true">
                              ♙
                            </span>

                            Locked
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              )}

              {/* =================================================
                  CERTIFICATION
              ================================================= */}

              <div className="flex flex-col gap-4 border-t border-[var(--border-soft)] bg-[var(--surface-soft)]/50 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[13px] ${
                      learnerJourney?.certificationUnlocked
                        ? "border-[var(--teal)] bg-[var(--teal-soft)] text-[var(--teal-deep)]"
                        : "border-[var(--border)] bg-white text-[var(--text-muted)]"
                    }`}
                  >
                    ◇
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Final Step
                    </p>

                    <h3 className="mt-1 text-[15px] font-semibold text-[var(--text-primary)]">
                      Certification
                    </h3>

                    <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                      Available after all training
                      days are complete.
                    </p>
                  </div>
                </div>

                <div className="shrink-0 pl-[52px] sm:pl-0">
                  {learnerJourney?.certificationUnlocked ? (
                    <Link
                      href="/learn/certification"
                      prefetch
                      className="inline-flex min-h-9 items-center justify-center rounded-[9px] bg-[var(--teal)] px-3.5 text-[12px] font-semibold text-white transition hover:bg-[var(--teal-deep)]"
                    >
                      Open
                    </Link>
                  ) : (
                    <span className="text-[11px] font-medium text-[var(--text-muted)]">
                      Locked
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}