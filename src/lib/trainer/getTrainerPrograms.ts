
import { createClient } from "@/lib/supabase/server";

export type TrainerProgram = {
  id: string;
  title: string;
  status: string;
  created_at: string | null;
};

export async function getTrainerPrograms(): Promise<TrainerProgram[]> {
  const supabase = await createClient();

  // ---------------------------------------------------------
  // AUTHENTICATION
  // ---------------------------------------------------------

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unable to authenticate trainer.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "trainer") {
    throw new Error("Trainer access required.");
  }

  // ---------------------------------------------------------
  // FETCH ALL AVAILABLE PROGRAMS
  // ---------------------------------------------------------

  const { data, error } = await supabase
    .from("programs")
    .select("id,title,status,created_at")
    .order("created_at", { ascending: false })
    .order("title", { ascending: true });

  if (error) {
    console.error(
      "Unable to load trainer programs:",
      error
    );

    throw new Error("Unable to load available training programs.");
  }

  return data ?? [];
}
