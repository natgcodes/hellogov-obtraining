import { redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import TrainerNotesWorkspace from "@/components/trainer/TrainerNotesWorkspace";
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

export default async function TrainerNotesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: trainer } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  if (!trainer || trainer.role !== "trainer") {
    redirect("/learn");
  }

  const [
    traineeNotesResponse,
    leadResponse,
  ] = await Promise.all([
    supabase
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
      }),

    supabase.rpc("is_training_lead"),
  ]);

  if (traineeNotesResponse.error) {
    console.error(
      "Unable to load trainee notes:",
      traineeNotesResponse.error
    );
  }

  if (leadResponse.error) {
    console.error(
      "Unable to verify Training Lead:",
      leadResponse.error
    );
  }

  const traineeNotes =
    (traineeNotesResponse.data ??
      []) as unknown as LearnerNote[];

  return (
    <AppShell
      role="trainer"
      userName={trainer.full_name}
      userEmail={trainer.email}
    >
      <TrainerNotesWorkspace
        currentUserId={user.id}
        currentUserName={
          trainer.full_name ??
          trainer.email ??
          "Trainer"
        }
        isTrainingLead={leadResponse.data === true}
        traineeNotes={traineeNotes}
      />
    </AppShell>
  );
}