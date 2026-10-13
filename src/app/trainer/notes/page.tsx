import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";

type LearnerNote = {
  id: string;
  note: string;
  created_at: string;
  updated_at: string;

  profiles: {
    full_name: string | null;
    email: string | null;
    team_lead: string | null;
  } | null;

  modules: {
    title: string;
    days: {
      day_number: number;
      title: string;
    } | null;
  } | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function TrainerNotesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: trainer,
    error: trainerError,
  } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  if (
    trainerError ||
    !trainer ||
    trainer.role !== "trainer"
  ) {
    redirect("/learn");
  }

  const {
    data,
    error,
  } = await supabase
    .from("learner_module_notes")
    .select(`
      id,
      note,
      created_at,
      updated_at,

      profiles:learner_id (
        full_name,
        email,
        team_lead
      ),

      modules:module_id (
        title,

        days:day_id (
          day_number,
          title
        )
      )
    `)
    .neq("note", "")
    .order("updated_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Unable to load trainee notes:",
      error
    );
  }

  const notes =
    (data ?? []) as unknown as LearnerNote[];

  return (
    <AppShell
      role="trainer"
      userName={trainer.full_name}
      userEmail={trainer.email}
    >
      <div className="mx-auto w-full max-w-[1080px] px-5 py-8 sm:px-7 lg:px-9 lg:py-10">
        {/* HEADER */}

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--teal-deep)]">
            Training Support
          </p>

          <h1 className="mt-1 text-[27px] font-semibold tracking-[-0.035em] text-[var(--text-primary)]">
            Trainee Notes
          </h1>

          <p className="mt-2 max-w-[680px] text-[12px] leading-5 text-[var(--text-secondary)]">
            Review notes, questions, and reminders
            saved by trainees throughout their
            onboarding modules.
          </p>
        </div>

        {/* SUMMARY */}

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[14px] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-xs)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
              Saved notes
            </p>

            <p className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
              {notes.length}
            </p>
          </div>

          <div className="rounded-[14px] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-xs)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
              Trainees with notes
            </p>

            <p className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
              {
                new Set(
                  notes.map(
                    (item) =>
                      item.profiles?.email
                  )
                ).size
              }
            </p>
          </div>
        </div>

        {/* NOTES */}

        <section className="mt-8">
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Trainee activity
            </p>

            <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
              All notes
            </h2>
          </div>

          {notes.length > 0 ? (
            <div className="space-y-3">
              {notes.map((item) => {
                const traineeName =
                  item.profiles?.full_name ??
                  "Unknown trainee";

                const traineeEmail =
                  item.profiles?.email ??
                  "";

                const day =
                  item.modules?.days;

                return (
                  <article
                    key={item.id}
                    className="rounded-[16px] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-xs)] sm:p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                            {traineeName}
                          </p>

                          {item.profiles
                            ?.team_lead && (
                            <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[9px] font-semibold text-[var(--text-secondary)]">
                              {
                                item.profiles
                                  .team_lead
                              }
                            </span>
                          )}
                        </div>

                        {traineeEmail && (
                          <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                            {traineeEmail}
                          </p>
                        )}
                      </div>

                      <p className="text-[10px] text-[var(--text-muted)]">
                        Updated{" "}
                        {formatDate(
                          item.updated_at
                        )}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {day && (
                        <span className="rounded-full bg-[var(--teal-soft)] px-2.5 py-1 text-[9.5px] font-semibold text-[var(--teal-deep)]">
                          Day {day.day_number}
                        </span>
                      )}

                      {day?.title && (
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {day.title}
                        </span>
                      )}
                    </div>

                    {item.modules?.title && (
                      <p className="mt-3 text-[11px] font-semibold text-[var(--text-primary)]">
                        {item.modules.title}
                      </p>
                    )}

                    <div className="mt-2 rounded-[11px] border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3.5">
                      <p className="whitespace-pre-wrap text-[12px] leading-5 text-[var(--text-secondary)]">
                        {item.note}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[16px] border border-dashed border-[var(--border-strong)] bg-white p-10 text-center">
              <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
                No trainee notes yet
              </h3>

              <p className="mt-2 text-[12px] text-[var(--text-secondary)]">
                Notes saved by trainees during their
                training modules will appear here.
              </p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}