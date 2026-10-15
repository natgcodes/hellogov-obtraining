import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type StatusRequest = { userId?: string; action?: "deactivate" | "reactivate"; reason?: string };

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const admin = createAdminClient();
    // Check the requesting trainer with the admin client: never trust client-supplied roles.
    const { data: actor, error: actorError } = await admin.from("profiles")
      .select("role, account_status").eq("id", user.id).single();
    if (actorError || actor?.role !== "trainer" || actor.account_status !== "active")
      return NextResponse.json({ error: "Active trainer access required." }, { status: 403 });
    const body = (await request.json()) as StatusRequest;
    if (!body.userId || !["deactivate", "reactivate"].includes(body.action ?? ""))
      return NextResponse.json({ error: "Invalid user or action." }, { status: 400 });
    if (body.userId === user.id) return NextResponse.json({ error: "You cannot change your own account status." }, { status: 400 });
    const reason = body.reason?.trim();
    if (body.action === "deactivate" && (!reason || reason.length > 500))
      return NextResponse.json({ error: "A reason (up to 500 characters) is required." }, { status: 400 });
    const { data: target, error: targetError } = await admin.from("profiles")
      .select("id, account_status").eq("id", body.userId).single();
    if (targetError || !target) return NextResponse.json({ error: "User not found." }, { status: 404 });
    const desired = body.action === "deactivate" ? "deactivated" : "active";
    if (target.account_status === desired) return NextResponse.json({ success: true, accountStatus: desired });

    // First ban in Auth on deactivation, then mark profile. On reactivation, unban last.
    if (body.action === "deactivate") {
      const { error: banError } = await admin.auth.admin.updateUserById(body.userId, { ban_duration: "876000h" });
      if (banError) return NextResponse.json({ error: "Could not disable login." }, { status: 500 });
    }
    const { error: profileError } = await admin.from("profiles").update({
      account_status: desired,
      deactivated_at: desired === "deactivated" ? new Date().toISOString() : null,
      deactivation_reason: desired === "deactivated" ? reason : null,
      deactivated_by: desired === "deactivated" ? user.id : null,
    }).eq("id", body.userId).eq("account_status", target.account_status).select("id").single();
    if (profileError) {
      // Do not silently reactivate after a failed deactivation: keep Auth banned (fail closed).
      return NextResponse.json({ error: "Account status could not be saved. Verify Auth and profile status before retrying." }, { status: 500 });
    }
    if (body.action === "reactivate") {
      const { error: unbanError } = await admin.auth.admin.updateUserById(body.userId, { ban_duration: "none" });
      if (unbanError) {
        await admin.from("profiles").update({ account_status: "deactivated", deactivated_at: new Date().toISOString(), deactivation_reason: "Reactivation failed; verify Auth ban", deactivated_by: user.id }).eq("id", body.userId);
        return NextResponse.json({ error: "Could not restore login. Account remains deactivated." }, { status: 500 });
      }
    }
    return NextResponse.json({ success: true, accountStatus: desired });
  } catch (error) {
    console.error("Account status change failed", error);
    return NextResponse.json({ error: "Unable to change account status." }, { status: 500 });
  }
}
