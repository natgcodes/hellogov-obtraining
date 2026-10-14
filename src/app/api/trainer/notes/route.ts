import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type NoteCategory =
  | "general"
  | "session"
  | "idea"
  | "follow_up"
  | "observation"
  | "lead_request";

type NoteStatus =
  | "open"
  | "in_progress"
  | "resolved";

type RequestBody = {
  action?: string;
  id?: string;
  noteId?: string;
  category?: string;
  title?: string;
  content?: string;
  traineeId?: string | null;
  observationType?: string | null;
  status?: string;
};

const categories: NoteCategory[] = [
  "general",
  "session",
  "idea",
  "follow_up",
  "observation",
  "lead_request",
];

const statuses: NoteStatus[] = [
  "open",
  "in_progress",
  "resolved",
];

const observationTypes = [
  "positive",
  "improvement",
  "general",
];

async function getContext() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      user: null,
      isTrainer: false,
      isLead: false,
    };
  }

  const [
    profileResponse,
    leadResponse,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single(),

    supabase.rpc("is_training_lead"),
  ]);

  return {
    supabase,
    user,
    isTrainer:
      profileResponse.data?.role === "trainer",
    isLead: leadResponse.data === true,
  };
}

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

function validCategory(
  value: unknown
): value is NoteCategory {
  return categories.includes(
    value as NoteCategory
  );
}

function validStatus(
  value: unknown
): value is NoteStatus {
  return statuses.includes(
    value as NoteStatus
  );
}

function normalizeObservation(
  value: unknown
) {
  return typeof value === "string" &&
    observationTypes.includes(value)
    ? value
    : null;
}

function validUuid(value: unknown) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

// ------------------------------------------------------------
// GET — NOTES, REPLIES, TRAINERS AND TRAINEES
// ------------------------------------------------------------

export async function GET() {
  const {
    supabase,
    isTrainer,
    isLead,
  } = await getContext();

  if (!isTrainer) {
    return errorResponse("Unauthorized", 403);
  }

  const [
    notesResponse,
    repliesResponse,
    profilesResponse,
  ] = await Promise.all([
    supabase
      .from("trainer_workspace_notes")
      .select("*")
      .order("updated_at", {
        ascending: false,
      }),

    supabase
      .from("trainer_workspace_replies")
      .select("*")
      .order("created_at", {
        ascending: true,
      }),

    supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .in("role", ["trainer", "learner"])
      .order("full_name"),
  ]);

  if (
    notesResponse.error ||
    repliesResponse.error ||
    profilesResponse.error
  ) {
    console.error("Trainer Notes load error:", {
      notes: notesResponse.error,
      replies: repliesResponse.error,
      profiles: profilesResponse.error,
    });

    return errorResponse(
      "Unable to load Trainer Notes.",
      500
    );
  }

  return NextResponse.json({
    notes: notesResponse.data ?? [],
    replies: repliesResponse.data ?? [],
    profiles: profilesResponse.data ?? [],
    isLead,
  });
}

// ------------------------------------------------------------
// POST — CREATE NOTE OR REPLY
// ------------------------------------------------------------

export async function POST(request: Request) {
  const {
    supabase,
    user,
    isTrainer,
    isLead,
  } = await getContext();

  if (!user || !isTrainer) {
    return errorResponse("Unauthorized", 403);
  }

  let body: RequestBody;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body.");
  }

  if (body.action === "reply") {
    if (!isLead) {
      return errorResponse(
        "Only Training Lead can reply.",
        403
      );
    }

    if (!validUuid(body.noteId)) {
      return errorResponse("Invalid request ID.");
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

    const { data: note, error: noteError } =
      await supabase
        .from("trainer_workspace_notes")
        .select("id, category")
        .eq("id", body.noteId!)
        .single();

    if (
      noteError ||
      note?.category !== "lead_request"
    ) {
      return errorResponse(
        "Request not found.",
        404
      );
    }

    const { error } = await supabase
      .from("trainer_workspace_replies")
      .insert({
        note_id: body.noteId,
        author_id: user.id,
        content,
      });

    if (error) {
      console.error(error);

      return errorResponse(
        "Unable to save reply.",
        500
      );
    }

    return NextResponse.json({
      success: true,
    });
  }

  if (!validCategory(body.category)) {
    return errorResponse("Invalid category.");
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
      "Title and content are required."
    );
  }

  const traineeId =
    body.traineeId || null;

  if (
    traineeId !== null &&
    !validUuid(traineeId)
  ) {
    return errorResponse(
      "Invalid trainee ID."
    );
  }

  const { error } = await supabase
    .from("trainer_workspace_notes")
    .insert({
      author_id: user.id,
      category: body.category,
      title,
      content,
      trainee_id: traineeId,
      observation_type:
        body.category === "observation"
          ? normalizeObservation(
              body.observationType
            ) ?? "general"
          : null,
      status: "open",
    });

  if (error) {
    console.error(error);

    return errorResponse(
      "Unable to create note.",
      500
    );
  }

  return NextResponse.json({
    success: true,
  });
}

// ------------------------------------------------------------
// PATCH — UPDATE NOTE OR REQUEST STATUS
// ------------------------------------------------------------

export async function PATCH(request: Request) {
  const {
    supabase,
    user,
    isTrainer,
    isLead,
  } = await getContext();

  if (!user || !isTrainer) {
    return errorResponse("Unauthorized", 403);
  }

  let body: RequestBody;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body.");
  }

  if (!validUuid(body.id)) {
    return errorResponse("Invalid note ID.");
  }

  const { data: existing, error: lookupError } =
    await supabase
      .from("trainer_workspace_notes")
      .select("id, author_id, category")
      .eq("id", body.id!)
      .single();

  if (lookupError || !existing) {
    return errorResponse(
      "Note not found.",
      404
    );
  }

  if (
    existing.author_id !== user.id &&
    !isLead
  ) {
    return errorResponse(
      "You cannot edit this note.",
      403
    );
  }

  if (body.action === "status") {
    if (
      !isLead ||
      existing.category !== "lead_request"
    ) {
      return errorResponse(
        "Only Training Lead can update request status.",
        403
      );
    }

    if (!validStatus(body.status)) {
      return errorResponse(
        "Invalid status."
      );
    }

    const { error } = await supabase
      .from("trainer_workspace_notes")
      .update({
        status: body.status,
      })
      .eq("id", body.id!);

    if (error) {
      return errorResponse(
        "Unable to update status.",
        500
      );
    }

    return NextResponse.json({
      success: true,
    });
  }

  if (!validCategory(body.category)) {
    return errorResponse(
      "Invalid category."
    );
  }

  if (
    existing.category === "lead_request" &&
    body.category !== "lead_request" &&
    !isLead
  ) {
    return errorResponse(
      "Only Training Lead can change a request category.",
      403
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
      "Title and content are required."
    );
  }

  const traineeId =
    body.traineeId || null;

  if (
    traineeId !== null &&
    !validUuid(traineeId)
  ) {
    return errorResponse(
      "Invalid trainee ID."
    );
  }

  const { error } = await supabase
    .from("trainer_workspace_notes")
    .update({
      category: body.category,
      title,
      content,
      trainee_id: traineeId,
      observation_type:
        body.category === "observation"
          ? normalizeObservation(
              body.observationType
            ) ?? "general"
          : null,
    })
    .eq("id", body.id!);

  if (error) {
    console.error(error);

    return errorResponse(
      "Unable to update note.",
      500
    );
  }

  return NextResponse.json({
    success: true,
  });
}

// ------------------------------------------------------------
// DELETE — DELETE NOTE
// ------------------------------------------------------------

export async function DELETE(request: Request) {
  const {
    supabase,
    user,
    isTrainer,
    isLead,
  } = await getContext();

  if (!user || !isTrainer) {
    return errorResponse("Unauthorized", 403);
  }

  let body: RequestBody;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body.");
  }

  if (!validUuid(body.id)) {
    return errorResponse("Invalid note ID.");
  }

  const { data: existing } = await supabase
    .from("trainer_workspace_notes")
    .select("id, author_id")
    .eq("id", body.id!)
    .single();

  if (!existing) {
    return errorResponse(
      "Note not found.",
      404
    );
  }

  if (
    existing.author_id !== user.id &&
    !isLead
  ) {
    return errorResponse(
      "You cannot delete this note.",
      403
    );
  }

  const { error } = await supabase
    .from("trainer_workspace_notes")
    .delete()
    .eq("id", body.id!);

  if (error) {
    console.error(error);

    return errorResponse(
      "Unable to delete note.",
      500
    );
  }

  return NextResponse.json({
    success: true,
  });
}