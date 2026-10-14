import { createClient } from "@/lib/supabase/server";
import { HELLOGOV_PROGRAM_ID } from "@/lib/constants/program";

export async function getTrainerProgram() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .eq("id", HELLOGOV_PROGRAM_ID)
    .single();

  if (error) {
    console.error(
      "Unable to load trainer program:",
      error
    );

    return null;
  }

  return data;
}