"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import TeamLeaderFeedbackWorkspace from "@/components/trainer/TeamLeaderFeedbackWorkspace";

type Tab =
  | "team"
  | "observations"
  | "requests"
  | "trainee_notes"
  | "team_leader_feedback";

type Category =
  | "general"
  | "session"
  | "idea"
  | "follow_up"
  | "observation"
  | "lead_request";

type Status =
  | "open"
  | "in_progress"
  | "resolved";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
};

type WorkspaceNote = {
  id: string;
  author_id: string;
  category: Category;
  title: string;
  content: string;
  trainee_id: string | null;
  observation_type: string | null;
  status: Status;
  created_at: string;
  updated_at: string;
};

type Reply = {
  id: string;
  note_id: string;
  author_id: string;
  content: string;
  created_at: string;
};

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

type Props = {
  currentUserId: string;
  currentUserName: string;
  isTrainingLead: boolean;
  traineeNotes: LearnerNote[];
};

type FormState = {
  id: string | null;
  category: Category;
  title: string;
  content: string;
  traineeId: string;
  observationType: string;
};

const emptyForm: FormState = {
  id: null,
  category: "general",
  title: "",
  content: "",
  traineeId: "",
  observationType: "general",
};

const tabs: {
  id: Tab;
  label: string;
}[] = [
  {
    id: "team",
    label: "Team Notes",
  },
  {
    id: "observations",
    label: "Trainee Observations",
  },
  {
    id: "requests",
    label: "Lead Requests",
  },
  {
    id: "trainee_notes",
    label: "Trainee Notes",
  },
  {
    id: "team_leader_feedback",
    label: "Feedback for Team Leaders",
  },
];

const categoryLabels: Record<Category, string> = {
  general: "General Note",
  session: "Session Notes",
  idea: "Idea",
  follow_up: "Follow-up",
  observation: "Trainee Observation",
  lead_request: "Lead Request",
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) =>
        part.charAt(0).toUpperCase()
      )
      .join("") || "T"
  );
}

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  let classes =
    "bg-[#F2F4F7] text-[#667085]";

  if (status === "open") {
    classes =
      "bg-amber-50 text-amber-700";
  }

  if (status === "in_progress") {
    classes =
      "bg-[#EAF8FA] text-[#07879B]";
  }

  if (status === "resolved") {
    classes =
      "bg-emerald-50 text-emerald-700";
  }

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${classes}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[15px] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-xs)]">
      <p className="text-[11px] font-medium text-[var(--text-secondary)]">
        {label}
      </p>

      <p className="mt-2 text-[25px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

async function apiRequest(
  method: string,
  body?: object
) {
  const response = await fetch(
    "/api/trainer/notes",
    {
      method,
      headers: body
        ? {
            "Content-Type": "application/json",
          }
        : undefined,
      body: body
        ? JSON.stringify(body)
        : undefined,
      cache: "no-store",
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ?? "Something went wrong."
    );
  }

  return result;
}

export default function TrainerNotesWorkspace({
  currentUserId,
  currentUserName,
  isTrainingLead,
  traineeNotes,
}: Props) {
  const [activeTab, setActiveTab] =
    useState<Tab>("team");

  const [notes, setNotes] =
    useState<WorkspaceNote[]>([]);

  const [replies, setReplies] =
    useState<Reply[]>([]);

  const [profiles, setProfiles] =
    useState<Profile[]>([]);

  const [isLead, setIsLead] =
    useState(isTrainingLead);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [authorFilter, setAuthorFilter] =
    useState("all");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [showForm, setShowForm] =
    useState(false);

  const [form, setForm] =
    useState<FormState>(emptyForm);

  const [replyDrafts, setReplyDrafts] =
    useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    try {
      const result = await apiRequest("GET");

      setNotes(result.notes ?? []);
      setReplies(result.replies ?? []);
      setProfiles(result.profiles ?? []);
      setIsLead(result.isLead === true);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load notes."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const profileMap = useMemo(() => {
    return new Map(
      profiles.map((profile) => [
        profile.id,
        profile,
      ])
    );
  }, [profiles]);

  const trainers = useMemo(() => {
    return profiles.filter(
      (profile) =>
        profile.role === "trainer"
    );
  }, [profiles]);

  const trainees = useMemo(() => {
    return profiles.filter(
      (profile) =>
        profile.role === "learner"
    );
  }, [profiles]);

  function getName(id: string) {
    if (id === currentUserId) {
      return currentUserName;
    }

    const profile = profileMap.get(id);

    return (
      profile?.full_name ??
      profile?.email ??
      "Unknown user"
    );
  }

  const teamNotes = notes.filter(
    (note) =>
      note.category !== "observation" &&
      note.category !== "lead_request"
  );

  const observations = notes.filter(
    (note) =>
      note.category === "observation"
  );

  const requests = notes.filter(
    (note) =>
      note.category === "lead_request"
  );

  const openRequests = requests.filter(
    (note) =>
      note.status !== "resolved"
  );

  const resolvedRequests = requests.filter(
    (note) =>
      note.status === "resolved"
  );

  const filteredNotes = useMemo(() => {
    let result = notes;

    if (activeTab === "team") {
      result = result.filter(
        (note) =>
          note.category !== "observation" &&
          note.category !== "lead_request"
      );
    }

    if (activeTab === "observations") {
      result = result.filter(
        (note) =>
          note.category === "observation"
      );
    }

    if (activeTab === "requests") {
      result = result.filter(
        (note) =>
          note.category === "lead_request"
      );
    }

    if (authorFilter !== "all") {
      result = result.filter(
        (note) =>
          note.author_id === authorFilter
      );
    }

    if (
      statusFilter !== "all" &&
      activeTab === "requests"
    ) {
      result = result.filter(
        (note) =>
          note.status === statusFilter
      );
    }

    const query = search
      .trim()
      .toLowerCase();

    if (query) {
      result = result.filter((note) => {
        const author =
          profileMap.get(note.author_id);

        const trainee = note.trainee_id
          ? profileMap.get(note.trainee_id)
          : null;

        return [
          note.title,
          note.content,
          note.category,
          author?.full_name,
          author?.email,
          trainee?.full_name,
          trainee?.email,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(query)
          );
      });
    }

    return result;
  }, [
    notes,
    activeTab,
    authorFilter,
    statusFilter,
    search,
    profileMap,
  ]);

  const filteredTraineeNotes = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) {
      return traineeNotes;
    }

    return traineeNotes.filter((item) =>
      [
        item.note,
        item.profiles?.full_name,
        item.profiles?.email,
        item.modules?.title,
        item.modules?.days?.title,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query)
        )
    );
  }, [traineeNotes, search]);

  function openCreate() {
    const category: Category =
      activeTab === "observations"
        ? "observation"
        : activeTab === "requests"
          ? "lead_request"
          : "general";

    setForm({
      ...emptyForm,
      category,
    });

    setShowForm(true);
    setError("");
  }

  function openEdit(note: WorkspaceNote) {
    setForm({
      id: note.id,
      category: note.category,
      title: note.title,
      content: note.content,
      traineeId:
        note.trainee_id ?? "",
      observationType:
        note.observation_type ?? "general",
    });

    setShowForm(true);
    setError("");
  }

  async function saveNote(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (
      !form.title.trim() ||
      !form.content.trim()
    ) {
      setError(
        "Title and content are required."
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        id: form.id,
        category: form.category,
        title: form.title,
        content: form.content,
        traineeId:
          form.traineeId || null,
        observationType:
          form.observationType,
      };

      await apiRequest(
        form.id ? "PATCH" : "POST",
        payload
      );

      setShowForm(false);
      setForm(emptyForm);

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save note."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(
    note: WorkspaceNote
  ) {
    const confirmed = window.confirm(
      `Delete "${note.title}"? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      await apiRequest("DELETE", {
        id: note.id,
      });

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete note."
      );
    }
  }

  async function updateStatus(
    note: WorkspaceNote,
    status: Status
  ) {
    setError("");

    try {
      await apiRequest("PATCH", {
        action: "status",
        id: note.id,
        status,
      });

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update status."
      );
    }
  }

  async function sendReply(
    noteId: string
  ) {
    const content =
      replyDrafts[noteId]?.trim();

    if (!content) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await apiRequest("POST", {
        action: "reply",
        noteId,
        content,
      });

      setReplyDrafts((current) => ({
        ...current,
        [noteId]: "",
      }));

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send reply."
      );
    } finally {
      setSaving(false);
    }
  }

  const activeTabLabel =
    tabs.find(
      (tab) => tab.id === activeTab
    )?.label ?? "Team Notes";

  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 py-7 sm:px-7 lg:px-8 lg:py-8">
      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--teal)]">
            Training Collaboration
          </p>

          <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.035em] text-[var(--text-primary)]">
            Training Notes
          </h1>

          <p className="mt-2 max-w-[680px] text-[12px] leading-5 text-[var(--text-secondary)]">
            One shared space for training notes,
            trainee observations, open questions,
            requests to the Training Lead,
            and feedback for Team Leaders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isLead && (
            <span className="rounded-full bg-[#EAF8FA] px-3 py-2 text-[10px] font-semibold text-[#07879B]">
              Training Lead
            </span>
          )}

          {activeTab !== "trainee_notes" &&
            activeTab !== "team_leader_feedback" && (
              <button
                type="button"
                onClick={openCreate}
                className="min-h-10 rounded-[10px] bg-[#08A9C1] px-4 text-[11px] font-semibold text-white transition hover:bg-[#078FA4]"
              >
                + New Note
              </button>
            )}
        </div>
      </div>

      {/* METRICS */}

      <div className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric
          label="Team Notes"
          value={teamNotes.length}
        />

        <Metric
          label="Trainee Observations"
          value={observations.length}
        />

        <Metric
          label="Open Lead Requests"
          value={openRequests.length}
        />

        <Metric
          label="Resolved Requests"
          value={resolvedRequests.length}
        />
      </div>

      {/* TABS */}

      <div className="mt-7 overflow-x-auto border-b border-[var(--border)]">
        <div className="flex min-w-max gap-6">
          {tabs.map((tab) => {
            const active =
              activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearch("");
                  setAuthorFilter("all");
                  setStatusFilter("all");
                  setShowForm(false);
                  setForm(emptyForm);
                  setError("");
                }}
                className={`border-b-2 px-1 pb-3 text-[12px] font-semibold transition ${
                  active
                    ? "border-[#08A9C1] text-[#07879B]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* FILTERS */}

      {activeTab !== "team_leader_feedback" && (
        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">
              {activeTabLabel}
            </h2>

            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              {activeTab === "trainee_notes"
                ? "Notes saved by trainees during their onboarding modules."
                : "Shared notes and updates from the Training team."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search notes..."
              className="min-h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-[12px] outline-none focus:border-[#08A9C1] sm:w-[220px]"
            />

            {activeTab !== "trainee_notes" && (
              <select
                value={authorFilter}
                onChange={(event) =>
                  setAuthorFilter(
                    event.target.value
                  )
                }
                className="min-h-10 rounded-[10px] border border-[var(--border)] bg-white px-3 text-[11px] text-[var(--text-secondary)]"
              >
                <option value="all">
                  All Trainers
                </option>

                {trainers.map((trainer) => (
                  <option
                    key={trainer.id}
                    value={trainer.id}
                  >
                    {trainer.full_name ??
                      trainer.email ??
                      "Trainer"}
                  </option>
                ))}
              </select>
            )}

            {activeTab === "requests" && (
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="min-h-10 rounded-[10px] border border-[var(--border)] bg-white px-3 text-[11px]"
              >
                <option value="all">
                  All Statuses
                </option>

                <option value="open">
                  Open
                </option>

                <option value="in_progress">
                  In Progress
                </option>

                <option value="resolved">
                  Resolved
                </option>
              </select>
            )}
          </div>
        </div>
      )}

      {/* ERRORS */}

      {activeTab !== "team_leader_feedback" &&
        error && (
          <div className="mt-5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
            {error}
          </div>
        )}

      {/* CREATE / EDIT FORM */}

      {activeTab !== "team_leader_feedback" &&
        showForm && (
          <section className="mt-6 rounded-[18px] border border-[#08A9C1]/30 bg-white p-5 shadow-[var(--shadow-xs)] sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#07879B]">
                  Workspace
                </p>

                <h3 className="mt-1 text-[17px] font-semibold text-[var(--text-primary)]">
                  {form.id
                    ? "Edit Note"
                    : "Create New Note"}
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowForm(false)
                }
                className="text-[20px] text-[var(--text-muted)]"
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={saveNote}
              className="mt-5 space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold text-[var(--text-secondary)]">
                    Category
                  </span>

                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        category:
                          event.target
                            .value as Category,
                      }))
                    }
                    className="min-h-11 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-[12px]"
                  >
                    {Object.entries(
                      categoryLabels
                    ).map(([value, label]) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold text-[var(--text-secondary)]">
                    Related Trainee (Optional)
                  </span>

                  <select
                    value={form.traineeId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        traineeId:
                          event.target.value,
                      }))
                    }
                    className="min-h-11 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-[12px]"
                  >
                    <option value="">
                      No specific trainee
                    </option>

                    {trainees.map((trainee) => (
                      <option
                        key={trainee.id}
                        value={trainee.id}
                      >
                        {trainee.full_name ??
                          trainee.email ??
                          "Trainee"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {form.category ===
                "observation" && (
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold text-[var(--text-secondary)]">
                    Observation Type
                  </span>

                  <select
                    value={
                      form.observationType
                    }
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        observationType:
                          event.target.value,
                      }))
                    }
                    className="min-h-11 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-[12px]"
                  >
                    <option value="general">
                      General Observation
                    </option>

                    <option value="positive">
                      Positive Feedback
                    </option>

                    <option value="improvement">
                      Opportunity for Improvement
                    </option>
                  </select>
                </label>
              )}

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold text-[var(--text-secondary)]">
                  Title
                </span>

                <input
                  required
                  maxLength={200}
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title:
                        event.target.value,
                    }))
                  }
                  placeholder="e.g. Day 2 Review — Order Status"
                  className="min-h-11 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-[12px] outline-none focus:border-[#08A9C1]"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold text-[var(--text-secondary)]">
                  Notes / Description
                </span>

                <textarea
                  required
                  rows={6}
                  maxLength={20000}
                  value={form.content}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      content:
                        event.target.value,
                    }))
                  }
                  placeholder="Write your notes, observations, questions, or follow-ups here..."
                  className="w-full resize-y rounded-[10px] border border-[var(--border)] bg-white px-3 py-3 text-[12px] leading-5 outline-none focus:border-[#08A9C1]"
                />
              </label>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowForm(false)
                  }
                  className="min-h-10 rounded-[10px] border border-[var(--border)] px-4 text-[11px] font-semibold text-[var(--text-secondary)]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-10 rounded-[10px] bg-[#08A9C1] px-5 text-[11px] font-semibold text-white disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : form.id
                      ? "Save Changes"
                      : "Create Note"}
                </button>
              </div>
            </form>
          </section>
        )}

      {/* FEEDBACK FOR TEAM LEADERS */}

      {activeTab === "team_leader_feedback" ? (
        <div className="mt-6">
          <TeamLeaderFeedbackWorkspace
            currentUserId={currentUserId}
            role="trainer"
          />
        </div>
      ) : activeTab === "trainee_notes" ? (
        /* TRAINEE MODULE NOTES */

        <div className="mt-6 space-y-3">
          {filteredTraineeNotes.length ===
          0 ? (
            <EmptyState
              title="No trainee notes found"
              description="Notes saved during onboarding modules will appear here."
            />
          ) : (
            filteredTraineeNotes.map(
              (item) => (
                <article
                  key={item.id}
                  className="rounded-[16px] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-xs)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                        {item.profiles
                          ?.full_name ??
                          "Unknown Trainee"}
                      </p>

                      <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                        {item.profiles
                          ?.email ?? ""}
                      </p>

                      {item.profiles
                        ?.team_lead && (
                        <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                          Team Lead:{" "}
                          {
                            item.profiles
                              .team_lead
                          }
                        </p>
                      )}
                    </div>

                    <span className="text-[10px] text-[var(--text-muted)]">
                      Updated{" "}
                      {formatDate(
                        item.updated_at
                      )}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.modules?.days && (
                      <span className="rounded-full bg-[#EAF8FA] px-2.5 py-1 text-[10px] font-semibold text-[#07879B]">
                        Day{" "}
                        {
                          item.modules.days
                            .day_number
                        }
                      </span>
                    )}

                    {item.modules?.title && (
                      <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                        {item.modules.title}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 rounded-[11px] bg-[#F7FAFB] px-4 py-3.5">
                    <p className="whitespace-pre-wrap text-[12px] leading-5 text-[var(--text-secondary)]">
                      {item.note}
                    </p>
                  </div>
                </article>
              )
            )
          )}
        </div>
      ) : (
        /* SHARED WORKSPACE NOTES */

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="rounded-[16px] border border-[var(--border)] bg-white p-8 text-center text-[12px] text-[var(--text-muted)]">
              Loading notes...
            </div>
          ) : filteredNotes.length === 0 ? (
            <EmptyState
              title="No notes found"
              description="Create a new note to start sharing information with the Training team."
            />
          ) : (
            filteredNotes.map((note) => {
              const authorName =
                getName(note.author_id);

              const traineeName =
                note.trainee_id
                  ? getName(
                      note.trainee_id
                    )
                  : null;

              const canManage =
                note.author_id ===
                  currentUserId ||
                isLead;

              const noteReplies =
                replies.filter(
                  (reply) =>
                    reply.note_id ===
                    note.id
                );

              return (
                <article
                  key={note.id}
                  className="overflow-hidden rounded-[17px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]"
                >
                  <div className="p-5 sm:p-6">
                    {/* AUTHOR */}

                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF8FA] text-[11px] font-semibold text-[#07879B]">
                          {initials(
                            authorName
                          )}
                        </div>

                        <div>
                          <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                            {authorName}
                          </p>

                          <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                            {formatDate(
                              note.created_at
                            )}
                          </p>
                        </div>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              openEdit(note)
                            }
                            className="text-[11px] font-semibold text-[#07879B]"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteNote(note)
                            }
                            className="text-[11px] font-semibold text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {/* CATEGORY */}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#EAF8FA] px-2.5 py-1 text-[10px] font-semibold text-[#07879B]">
                        {
                          categoryLabels[
                            note.category
                          ]
                        }
                      </span>

                      {traineeName && (
                        <span className="rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[10px] font-medium text-[var(--text-secondary)]">
                          {traineeName}
                        </span>
                      )}

                      {note.observation_type &&
                        note.category ===
                          "observation" && (
                          <span className="rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[10px] font-medium text-[var(--text-secondary)]">
                            {formatStatus(
                              note.observation_type
                            )}
                          </span>
                        )}

                      {note.category ===
                        "lead_request" && (
                        <StatusBadge
                          status={note.status}
                        />
                      )}
                    </div>

                    {/* CONTENT */}

                    <h3 className="mt-4 text-[15px] font-semibold text-[var(--text-primary)]">
                      {note.title}
                    </h3>

                    <p className="mt-3 whitespace-pre-wrap text-[12px] leading-6 text-[var(--text-secondary)]">
                      {note.content}
                    </p>

                    {note.updated_at !==
                      note.created_at && (
                      <p className="mt-4 text-[10px] text-[var(--text-muted)]">
                        Last updated{" "}
                        {formatDate(
                          note.updated_at
                        )}
                      </p>
                    )}
                  </div>

                  {/* LEAD REQUEST SECTION */}

                  {note.category ===
                    "lead_request" && (
                    <div className="border-t border-[var(--border-soft)] bg-[#FAFCFC] px-5 py-5 sm:px-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold text-[var(--text-primary)]">
                          Training Lead Response
                        </p>

                        {isLead && (
                          <select
                            value={
                              note.status
                            }
                            onChange={(event) =>
                              updateStatus(
                                note,
                                event.target
                                  .value as Status
                              )
                            }
                            className="min-h-9 rounded-[9px] border border-[var(--border)] bg-white px-3 text-[11px]"
                          >
                            <option value="open">
                              Open
                            </option>

                            <option value="in_progress">
                              In Progress
                            </option>

                            <option value="resolved">
                              Resolved
                            </option>
                          </select>
                        )}
                      </div>

                      {noteReplies.length >
                      0 ? (
                        <div className="mt-4 space-y-3">
                          {noteReplies.map(
                            (reply) => (
                              <div
                                key={
                                  reply.id
                                }
                                className="rounded-[11px] border border-[var(--border-soft)] bg-white p-4"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-[11px] font-semibold text-[#07879B]">
                                    {getName(
                                      reply.author_id
                                    )}
                                  </p>

                                  <p className="text-[10px] text-[var(--text-muted)]">
                                    {formatDate(
                                      reply.created_at
                                    )}
                                  </p>
                                </div>

                                <p className="mt-2 whitespace-pre-wrap text-[12px] leading-5 text-[var(--text-secondary)]">
                                  {
                                    reply.content
                                  }
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <p className="mt-3 text-[11px] text-[var(--text-muted)]">
                          No response yet.
                        </p>
                      )}

                      {isLead && (
                        <div className="mt-4">
                          <textarea
                            rows={3}
                            value={
                              replyDrafts[
                                note.id
                              ] ?? ""
                            }
                            onChange={(event) =>
                              setReplyDrafts(
                                (current) => ({
                                  ...current,
                                  [note.id]:
                                    event.target
                                      .value,
                                })
                              )
                            }
                            placeholder="Write a response visible to all trainers..."
                            className="w-full resize-y rounded-[10px] border border-[var(--border)] bg-white px-3 py-3 text-[12px] leading-5 outline-none focus:border-[#08A9C1]"
                          />

                          <div className="mt-2 flex justify-end">
                            <button
                              type="button"
                              disabled={
                                saving ||
                                !replyDrafts[
                                  note.id
                                ]?.trim()
                              }
                              onClick={() =>
                                sendReply(
                                  note.id
                                )
                              }
                              className="min-h-9 rounded-[9px] bg-[#08A9C1] px-4 text-[11px] font-semibold text-white disabled:opacity-50"
                            >
                              Send Response
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[17px] border border-dashed border-[var(--border)] bg-white px-6 py-12 text-center">
      <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
        {title}
      </h3>

      <p className="mt-2 text-[12px] text-[var(--text-muted)]">
        {description}
      </p>
    </div>
  );
}