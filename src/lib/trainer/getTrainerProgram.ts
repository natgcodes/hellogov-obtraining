import { createClient } from "@/lib/supabase/server";

const HELLOGOV_PROGRAM_ID =
  "5f5a6ef1-3133-45f6-b421-0dc09ea4a6a0";

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