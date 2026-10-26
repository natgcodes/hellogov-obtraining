import { createClient } from "@/lib/supabase/server";

export async function getLearnerAssignedProgram(): Promise<
  string | null
> {
  const supabase = await createClient();

  // Identify the authenticated user.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Retrieve the user's active program assignment.
  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("active_program_id")
      .eq("id", user.id)
      .single();

  if (profileError || !profile?.active_program_id) {
    return null;
  }

  // Verify that the user is enrolled in the assigned program.
  const { data: enrollment, error: enrollmentError } =
    await supabase
      .from("program_enrollments")
      .select("id")
      .eq("learner_id", user.id)
      .eq("program_id", profile.active_program_id)
      .maybeSingle();

  if (enrollmentError || !enrollment) {
    return null;
  }

  return profile.active_program_id;
}