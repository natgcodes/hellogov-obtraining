import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import SetupChecklist from "@/components/learning/SetupChecklist";
import LearnerProgressBar from "@/components/learning/LearnerProgressBar";
import { createClient } from "@/lib/supabase/server";
import { getLearnerProgram } from "@/lib/learning/getLearnerProgram";
import {
  getImpersonatedLearnerProgress,
  getImpersonatedLearnerJourney,
} from "@/lib/trainer/getImpersonatedLearner";

type PageProps = {
  params: Promise<{
    learnerId: string;
  }>;
};

export default async function ImpersonateLearnerPage({
  params,
}: PageProps) {
  const { learnerId } = await params;
  const supabase = await createClient();

  // ============================================================
  // AUTH + TRAINER SECURITY
  // ============================================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: trainerProfile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  if (
    !trainerProfile ||
    trainerProfile.role !== "trainer"
  ) {
    redirect("/learn");
  }

  // ============================================================
  // TARGET TRAINEE + PROGRAM
  // ============================================================

  const [traineeResult, program] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("id", learnerId)
      .single(),

    getLearnerProgram(),
  ]);

  const {
    data: trainee,
    error: traineeError,
  } = traineeResult;

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

  const firstName =
    trainee.full_name
      ?.trim()
      .split(/\s+/)[0] || "there";

  // ============================================================
  // NO PUBLISHED PROGRAM
  // ============================================================

  if (!program) {
    return (
      <AppShell
        role="trainer"
        userName={trainee.full_name}
        userEmail={trainee.email}
        impersonation={{
          learnerId,
          learnerName: traineeName,
          learnerEmail: trainee.email,
        }}
      >
        <ImpersonationBanner
          traineeName={traineeName}
          learnerId={learnerId}
        />

        <div className="px-5 py-8 sm:px-7 lg:px-8">
          <div className="mx-auto max-w-[1180px]">
            <div className="rounded-[16px] border border-[var(--border)] bg-white p-10 text-center shadow-[var(--shadow-xs)]">
              <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
                Training is not available yet
              </h1>

              <p className="mt-2 text-[14px] text-[var(--text-secondary)]">
                This trainee&apos;s onboarding program
                has not been published.
              </p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // ============================================================
  // TARGET TRAINEE PROGRESS + JOURNEY
  // ============================================================

  const [progress, learnerJourney] =
    await Promise.all([
      getImpersonatedLearnerProgress(
        program.id,
        learnerId
      ),

      getImpersonatedLearnerJourney(
        learnerId
      ),
    ]);

  // ============================================================
  // DAY STATES
  // ============================================================

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

  // ============================================================
  // DERIVED OVERVIEW STATE
  // ============================================================

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

  const totalDays =
    dayStates.length;

  const currentDayState =
    dayStates.find(
      ({ unlocked, completed }) =>
        unlocked && !completed
    ) ?? null;

  const allDaysComplete =
    totalDays > 0 &&
    completedDays === totalDays;

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

  const impersonationBase =
    `/trainer/impersonate/${learnerId}`;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <AppShell
      role="trainer"
      userName={trainee.full_name}
      userEmail={trainee.email}
      learnerJourney={
        learnerJourneyWithSetup
      }
      impersonation={{
        learnerId,
        learnerName: traineeName,
        learnerEmail: trainee.email,
      }}
    >
      <ImpersonationBanner
        traineeName={traineeName}
        learnerId={learnerId}
      />

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
              JOURNEY SUMMARY
          ================================================= */}

          <section className="mt-7">
            <div className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-white px-5 py-5 shadow-[var(--shadow-xs)] sm:px-7 sm:py-6">
              <div className="flex items-start">
                {dayStates.map(
                  (
                    {
                      day,
                      unlocked,
                      completed,
                    },
                    index
                  ) => {
                    const isCurrent =
                      currentDayState?.day.id ===
                      day.id;

                    const shortTitles:
                      Record<number, string> = {
                      1: "Foundations",
                      2: "Platform & Tools",
                      3: "Support Actions",
                      4: "Exceptions",
                    };

                    const shortTitle =
                      shortTitles[
                        day.day_number
                      ] ?? day.title;

                    return (
                      <div
                        key={day.id}
                        className="relative flex min-w-0 flex-1 flex-col items-center"
                      >
                        {index > 0 && (
                          <div
                            className={`absolute right-1/2 top-[14px] h-[2px] w-full ${
                              completed ||
                              isCurrent
                                ? "bg-[#08A9C1]"
                                : "bg-[#dce7ea]"
                            }`}
                          />
                        )}

                        <div
                          className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-bold ${
                            completed
                              ? "border-[#15966A] bg-[#15966A] text-white"
                              : isCurrent
                                ? "border-[#08A9C1] bg-white text-[#08A9C1] shadow-[0_0_0_4px_rgba(8,169,193,0.10)]"
                                : unlocked
                                  ? "border-[#08A9C1] bg-white text-[#08A9C1]"
                                  : "border-[#d7e3e7] bg-white text-[#9bb0b8]"
                          }`}
                        >
                          {completed ? (
                            "✓"
                          ) : isCurrent ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-[#08A9C1]" />
                          ) : unlocked ? (
                            day.day_number
                          ) : (
                            <svg
                              className="h-3 w-3"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <rect
                                x="6"
                                y="10"
                                width="12"
                                height="9"
                                rx="2"
                              />

                              <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
                            </svg>
                          )}
                        </div>

                        <p
                          className={`mt-2 text-center text-[11px] font-semibold ${
                            isCurrent
                              ? "text-[#07879B]"
                              : completed
                                ? "text-[var(--text-primary)]"
                                : "text-[var(--text-muted)]"
                          }`}
                        >
                          Day {day.day_number}
                        </p>

                        <p className="mt-0.5 max-w-[120px] truncate text-center text-[10px] text-[var(--text-muted)]">
                          {shortTitle}
                        </p>
                      </div>
                    );
                  }
                )}

                {/* CERTIFICATION */}

                <div className="relative flex min-w-0 flex-1 flex-col items-center">
                  <div
                    className={`absolute right-1/2 top-[14px] h-[2px] w-full ${
                      allDaysComplete
                        ? "bg-[#08A9C1]"
                        : "bg-[#dce7ea]"
                    }`}
                  />

                  <div
                    className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                      learnerJourney?.certificationUnlocked
                        ? "border-[#08A9C1] bg-[#EAF8FA] text-[#07879B]"
                        : "border-[#d7e3e7] bg-white text-[#9bb0b8]"
                    }`}
                  >
                    {learnerJourney?.certificationUnlocked ? (
                      <span className="text-[11px]">
                        ◇
                      </span>
                    ) : (
                      <svg
                        className="h-3 w-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect
                          x="6"
                          y="10"
                          width="12"
                          height="9"
                          rx="2"
                        />

                        <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
                      </svg>
                    )}
                  </div>

                  <p className="mt-2 text-center text-[11px] font-semibold text-[var(--text-muted)]">
                    Certification
                  </p>

                  <p className="mt-0.5 text-center text-[10px] text-[var(--text-muted)]">
                    Final Assessment
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              TOP OVERVIEW
          ================================================= */}

          <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">

            {/* CONTINUE LEARNING */}

            <div className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
              <div className="border-b border-[var(--border-soft)] px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#07879B]">
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
                    <span className="rounded-full bg-[#EAF8FA] px-3 py-1.5 text-[11px] font-semibold text-[#07879B]">
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
                        href={`${impersonationBase}/day/${currentDayState.day.id}`}
                        prefetch
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] bg-[#08A9C1] px-4 text-[13px] font-semibold !text-white shadow-[0_4px_12px_rgba(8,169,193,0.16)] transition hover:bg-[#0795AA] hover:!text-white"
                      >
                        Continue training

                        <span aria-hidden="true">
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
                        <span className="inline-flex min-h-10 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 text-[13px] font-semibold text-[var(--text-muted)]">
                          Certification · Read only
                        </span>
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
                      <span className="text-[#08A9C1]">
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

                <div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-[#EAF8FA] text-[16px] font-semibold text-[#08A9C1]">
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
  title={program.setup_section?.title}
  description={program.setup_section?.description}
  instructions={program.setup_section?.instructions}
  readOnly
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
                          ? "bg-[#EAF8FA]/50"
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
                                  ? "border-[#08A9C1] bg-[#08A9C1] text-white"
                                  : accessible
                                    ? "border-[#08A9C1] bg-white text-[#08A9C1]"
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
                                  ? "text-[#07879B]"
                                  : "text-[var(--text-muted)]"
                              }`}
                            >
                              Day {day.day_number}
                            </p>

                            {isCurrent && (
                              <span className="rounded-full bg-[#EAF8FA] px-2 py-0.5 text-[10px] font-semibold text-[#07879B]">
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
                            href={`${impersonationBase}/day/${day.id}`}
                            prefetch
                            className={`inline-flex min-h-9 items-center justify-center rounded-[9px] px-3.5 text-[12px] font-semibold transition ${
                              isCurrent
                                ? "bg-[#08A9C1] !text-white hover:bg-[#0795AA] hover:!text-white"
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

              {/* CERTIFICATION */}

              <div className="flex flex-col gap-4 border-t border-[var(--border-soft)] bg-[var(--surface-soft)]/50 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[13px] ${
                      learnerJourney?.certificationUnlocked
                        ? "border-[#08A9C1] bg-[#EAF8FA] text-[#07879B]"
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
                    <span className="inline-flex min-h-9 items-center justify-center rounded-[9px] border border-[var(--border)] bg-[var(--surface-muted)] px-3.5 text-[12px] font-semibold text-[var(--text-muted)]">
                      Read only
                    </span>
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

// ============================================================
// IMPERSONATION BANNER
// ============================================================

function ImpersonationBanner({
  traineeName,
  learnerId,
}: {
  traineeName: string;
  learnerId: string;
}) {
  return (
    <div className="border-b border-[#08A9C1]/20 bg-[#EAF8FA]">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-7 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#08A9C1] text-white">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />

              <circle
                cx="12"
                cy="12"
                r="2.5"
              />
            </svg>
          </div>

          <div>
            <p className="text-[12px] font-semibold text-[#07879B]">
              Impersonating {traineeName}
            </p>

            <p className="text-[11px] text-[var(--text-secondary)]">
              Read-only trainee preview
            </p>
          </div>
        </div>

        <Link
          href={`/trainer/learners/${learnerId}`}
          className="inline-flex min-h-9 items-center justify-center rounded-[9px] border border-[#08A9C1]/30 bg-white px-3.5 text-[12px] font-semibold !text-[#07879B] transition hover:bg-[#F5FCFD]"
        >
          Exit impersonation
        </Link>
      </div>
    </div>
  );
}