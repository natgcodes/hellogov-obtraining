import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RequestBody = {
  action?: string;
  id?: string;
  feedbackId?: string;
  teamLeaderId?: string;
  learnerId?: string | null;
  title?: string;
  content?: string;
  attachmentId?: string;
  fileName?: string;
};

function errorResponse(
  message: string,
  status = 400
) {
  return NextResponse.json(
    { error: message },
    { status }
  );
}

function cleanText(
  value: unknown,
  maxLength: number
) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function validUuid(value: unknown) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

async function getContext() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      user: null,
      role: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .single();

  const role =
    profile?.account_status === "active" &&
    (profile.role === "trainer" ||
      profile.role === "team_leader")
      ? profile.role
      : null;

  return {
    supabase,
    user,
    role,
  };
}

// ------------------------------------------------------------
// GET — FEEDBACK, REPLIES, PROFILES AND ASSIGNMENTS
// ------------------------------------------------------------

export async function GET(request: Request) {
  const { supabase, user, role } =
    await getContext();

  if (!user || !role) {
    return errorResponse("Unauthorized", 403);
  }

  const url = new URL(request.url);
  const attachmentId = url.searchParams.get("attachmentId");
  if (attachmentId !== null) {
    if (!validUuid(attachmentId)) return errorResponse("Invalid attachment ID.");
    const { data: attachment, error } = await supabase
      .from("team_leader_feedback_attachments")
      .select("file_path, file_name")
      .eq("id", attachmentId)
      .maybeSingle();
    if (error || !attachment) return errorResponse("Attachment not found.", 404);
    const { data: signed, error: signError } = await supabase.storage
      .from("feedback-attachments")
      .createSignedUrl(attachment.file_path, 60, {
        download: url.searchParams.get("download") === "1" ? attachment.file_name : false,
      });
    if (signError || !signed) return errorResponse("Unable to open attachment.", 403);
    return NextResponse.redirect(signed.signedUrl, { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
  }

  // Feedback visibility is always determined through
  // the authenticated Supabase client and its RLS policies.

  const feedbackQuery = supabase
    .from("team_leader_feedback")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (role === "team_leader") {
    feedbackQuery.eq("team_leader_id", user.id);
  }

  const {
    data: feedback,
    error: feedbackError,
  } = await feedbackQuery;

  if (feedbackError) {
    console.error(
      "Unable to load Team Leader feedback:",
      feedbackError
    );

    return errorResponse(
      "Unable to load feedback.",
      500
    );
  }

  const feedbackIds = (feedback ?? []).map(
    (item) => item.id
  );

  let replies: {
    id: string;
    feedback_id: string;
    author_id: string;
    content: string;
    created_at: string;
  }[] = [];

  // Only retrieve replies belonging to feedback
  // already accessible to the current user.

  if (feedbackIds.length > 0) {
    const { data, error } = await supabase
      .from("team_leader_feedback_replies")
      .select("*")
      .in("feedback_id", feedbackIds)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Unable to load feedback replies:",
        error
      );

      return errorResponse(
        "Unable to load feedback replies.",
        500
      );
    }

    replies = data ?? [];
  }

  // ----------------------------------------------------------
  // COLLECT PROFILE IDS REFERENCED IN VISIBLE FEEDBACK
  // ----------------------------------------------------------

  const attachments: { id: string; feedback_id: string; file_name: string; file_size: number }[] = [];
  if (feedbackIds.length > 0) {
    // Fetch through the authenticated client, never the service role.
    for (let offset = 0; ; offset += 200) {
      const { data, error } = await supabase
        .from("team_leader_feedback_attachments")
        .select("id, feedback_id, file_name, file_size")
        .in("feedback_id", feedbackIds)
        .order("id")
        .range(offset, offset + 199);
      if (error) return errorResponse("Unable to load attachments.", 500);
      attachments.push(...(data ?? []));
      if (!data || data.length < 200) break;
    }
  }

  const relatedIds = new Set<string>();

  for (const item of feedback ?? []) {
    relatedIds.add(item.author_id);
    relatedIds.add(item.team_leader_id);

    if (item.learner_id) {
      relatedIds.add(item.learner_id);
    }
  }

  for (const reply of replies) {
    relatedIds.add(reply.author_id);
  }

  let profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
    role: string;
  }[] = [];

  if (role === "trainer") {
    // Trainers retain their existing profile access.
    // This also provides the available Team Leaders
    // and agents for the feedback creation form.

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .in("role", [
        "trainer",
        "team_leader",
        "learner",
      ])
      .eq("account_status", "active")
      .order("full_name");

    if (error) {
      console.error(
        "Unable to load trainer profiles:",
        error
      );

      return errorResponse(
        "Unable to load profiles.",
        500
      );
    }

    profiles = data ?? [];
  } else if (relatedIds.size > 0) {
    // Team Leaders may not have RLS permission
    // to read Trainer or Learner profiles directly.
    //
    // Use the server-only admin client exclusively
    // for the profiles referenced by feedback and
    // replies that this Team Leader can already see.

    const admin = createAdminClient();

    const { data, error } = await admin
      .from("profiles")
      .select("id, full_name, email, role")
      .in("id", [...relatedIds]);

    if (error) {
      console.error(
        "Unable to load related feedback profiles:",
        error
      );

      return errorResponse(
        "Unable to load related profiles.",
        500
      );
    }

    profiles = data ?? [];
  }

  // ----------------------------------------------------------
  // TEAM ASSIGNMENTS — TRAINERS ONLY
  // ----------------------------------------------------------

  let assignments: {
    team_leader_id: string;
    learner_id: string;
  }[] = [];

  if (role === "trainer") {
    const { data, error } = await supabase
      .from("team_leader_assignments")
      .select("team_leader_id, learner_id");

    if (error) {
      console.error(
        "Unable to load team assignments:",
        error
      );

      return errorResponse(
        "Unable to load team assignments.",
        500
      );
    }

    assignments = data ?? [];
  }

  return NextResponse.json({
    feedback: feedback ?? [],
    replies,
    attachments,
    profiles,
    assignments,
    role,
  });
}

// ------------------------------------------------------------
// POST — CREATE FEEDBACK OR REPLY
// ------------------------------------------------------------

export async function POST(request: Request) {
  const { supabase, user, role } =
    await getContext();

  if (!user || !role) {
    return errorResponse("Unauthorized", 403);
  }

  let body: RequestBody;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body.");
  }

  // Reply to an existing feedback conversation.

  if (body.action === "reply") {
    if (!validUuid(body.feedbackId)) {
      return errorResponse(
        "Invalid feedback ID."
      );
    }

    const content = cleanText(
      body.content,
      10000
    );

    if (!content) {
      return errorResponse(
        "Reply cannot be empty."
      );
    }

    const {
      data: feedback,
      error: lookupError,
    } = await supabase
      .from("team_leader_feedback")
      .select("id, team_leader_id")
      .eq("id", body.feedbackId!)
      .maybeSingle();

    if (lookupError || !feedback) {
      return errorResponse(
        "Feedback not found.",
        404
      );
    }

    if (
      role === "team_leader" &&
      feedback.team_leader_id !== user.id
    ) {
      return errorResponse(
        "You cannot reply to this feedback.",
        403
      );
    }

    const { error } = await supabase
      .from("team_leader_feedback_replies")
      .insert({
        feedback_id: body.feedbackId,
        author_id: user.id,
        content,
      });

    if (error) {
      console.error(
        "Unable to create feedback reply:",
        error
      );

      return errorResponse(
        "Unable to save reply.",
        500
      );
    }

    return NextResponse.json({
      success: true,
    });
  }

  // Only Trainers can create feedback publications.

  if (role !== "trainer") {
    return errorResponse(
      "Only Trainers can create feedback.",
      403
    );
  }

  if (body.action === "registerAttachment" || body.action === "cleanupAttachment") {
    if (!validUuid(body.feedbackId) || !validUuid(body.attachmentId)) {
      return errorResponse("Invalid attachment reference.");
    }
    const feedbackId = body.feedbackId!;
    const id = body.attachmentId!;
    const path = `${feedbackId}/${id}.pdf`;
    const { data: parent, error: parentError } = await supabase
      .from("team_leader_feedback").select("id, author_id")
      .eq("id", feedbackId).maybeSingle();
    if (parentError || !parent || parent.author_id !== user.id) {
      return errorResponse("Feedback not found or access denied.", 403);
    }
    const { data: existing, error: existingError } = await supabase
      .from("team_leader_feedback_attachments").select("id, feedback_id, file_path")
      .eq("id", id).maybeSingle();
    if (existingError) return errorResponse("Unable to verify attachment.", 500);
    if (existing) {
      if (existing.feedback_id !== feedbackId || existing.file_path !== path) {
        return errorResponse("Attachment reference conflict.", 409);
      }
      // A retry after a lost response must never overwrite or remove a registered PDF.
      return NextResponse.json({ success: true, registered: true });
    }
    // The service role is needed only for an exact, author-owned unregistered
    // object: RLS deliberately prevents reading/deleting orphan objects.
    const storage = createAdminClient().storage.from("feedback-attachments");
    if (body.action === "cleanupAttachment") {
      const { error } = await storage.remove([path]);
      if (error) return errorResponse("Unable to clean up pending attachment.", 500);
      return NextResponse.json({ success: true, registered: false });
    }
    const fileName = cleanText(body.fileName, 255);
    if (!fileName || !/\.pdf$/i.test(fileName) || /[\x00-\x1f\x7f/\\]/.test(fileName)) {
      return errorResponse("Invalid PDF filename.");
    }
    const { data: blob, error: downloadError } = await storage.download(path);
    if (downloadError || !blob) return errorResponse("PDF upload not found. Retry the upload.", 409);
    const header = new TextDecoder().decode(await blob.slice(0, 5).arrayBuffer());
    if (blob.size <= 0 || blob.size > 10485760 || header !== "%PDF-") {
      return errorResponse("Invalid PDF or file exceeds 10 MB.");
    }
    const { error: insertError } = await supabase
      .from("team_leader_feedback_attachments").insert({
        id, feedback_id: feedbackId, file_name: fileName, file_path: path,
        file_size: blob.size, mime_type: "application/pdf", uploaded_by: user.id,
      });
    if (insertError) return errorResponse("Unable to register PDF. Retry or discard the pending attachment.", 500);
    return NextResponse.json({ success: true, registered: true });
  }

  if (!validUuid(body.teamLeaderId)) {
    return errorResponse(
      "Select a valid Team Leader."
    );
  }

  const learnerId =
    body.learnerId || null;

  if (
    learnerId !== null &&
    !validUuid(learnerId)
  ) {
    return errorResponse(
      "Invalid agent ID."
    );
  }

  const title = cleanText(
    body.title,
    200
  );

  const content = cleanText(
    body.content,
    20000
  );

  if (!title || !content) {
    return errorResponse(
      "Title and feedback are required."
    );
  }

  if (body.id !== undefined && !validUuid(body.id)) return errorResponse("Invalid feedback ID.");
  const feedbackId = body.id ?? crypto.randomUUID();
  const { error } = await supabase
    .from("team_leader_feedback")
    .insert({
      id: feedbackId,
      author_id: user.id,
      team_leader_id: body.teamLeaderId,
      learner_id: learnerId,
      title,
      content,
    });

  if (error) {
    const { data: existing } = await supabase.from("team_leader_feedback")
      .select("id, author_id, team_leader_id, learner_id, title, content")
      .eq("id", feedbackId).maybeSingle();
    if (existing && existing.author_id === user.id && existing.team_leader_id === body.teamLeaderId &&
        existing.learner_id === learnerId && existing.title === title && existing.content === content) {
      return NextResponse.json({ success: true, feedbackId });
    }
    console.error(
      "Unable to create Team Leader feedback:",
      error
    );

    return errorResponse(
      "Unable to publish feedback. Verify the Team Leader and assigned agent.",
      500
    );
  }

  return NextResponse.json({ success: true, feedbackId });
}

// ------------------------------------------------------------
// PATCH — EDIT FEEDBACK TITLE AND CONTENT
// ------------------------------------------------------------

export async function PATCH(request: Request) {
  const { supabase, user, role } =
    await getContext();

  if (!user || role !== "trainer") {
    return errorResponse("Unauthorized", 403);
  }

  let body: RequestBody;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body.");
  }

  if (!validUuid(body.id)) {
    return errorResponse(
      "Invalid feedback ID."
    );
  }

  const title = cleanText(
    body.title,
    200
  );

  const content = cleanText(
    body.content,
    20000
  );

  if (!title || !content) {
    return errorResponse(
      "Title and feedback are required."
    );
  }

  const {
    data: existing,
    error: lookupError,
  } = await supabase
    .from("team_leader_feedback")
    .select("id, author_id")
    .eq("id", body.id!)
    .maybeSingle();

  if (lookupError || !existing) {
    return errorResponse(
      "Feedback not found.",
      404
    );
  }

  if (existing.author_id !== user.id) {
    return errorResponse(
      "Only the original author can edit this feedback.",
      403
    );
  }

  const { error } = await supabase
    .from("team_leader_feedback")
    .update({
      title,
      content,
    })
    .eq("id", body.id!)
    .eq("author_id", user.id);

  if (error) {
    console.error(
      "Unable to update feedback:",
      error
    );

    return errorResponse(
      "Unable to update feedback.",
      500
    );
  }

  return NextResponse.json({
    success: true,
  });
}