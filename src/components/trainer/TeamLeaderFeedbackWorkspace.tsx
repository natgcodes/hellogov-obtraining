"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Role = "trainer" | "team_leader";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
};

type Assignment = {
  team_leader_id: string;
  learner_id: string;
};

type Feedback = {
  id: string;
  author_id: string;
  team_leader_id: string;
  learner_id: string | null;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

type Reply = {
  id: string;
  feedback_id: string;
  author_id: string;
  content: string;
  created_at: string;
};

type ApiData = {
  feedback: Feedback[];
  replies: Reply[];
  profiles: Profile[];
  assignments: Assignment[];
  role: Role;
};

type Props = {
  currentUserId: string;
  role: Role;
};

type FeedbackForm = {
  id: string | null;
  teamLeaderId: string;
  learnerId: string;
  title: string;
  content: string;
};

const emptyForm: FeedbackForm = {
  id: null,
  teamLeaderId: "",
  learnerId: "",
  title: "",
  content: "",
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
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getDisplayName(profile?: Profile) {
  return profile?.full_name ?? profile?.email ?? "Unknown user";
}

async function feedbackRequest(
  method: "GET" | "POST" | "PATCH",
  body?: object
): Promise<ApiData | { success: boolean }> {
  const response = await fetch(
    "/api/trainer/team-leader-feedback",
    {
      method,
      headers: body
        ? { "Content-Type": "application/json" }
        : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error ?? "Something went wrong.");
  }

  return result;
}

export default function TeamLeaderFeedbackWorkspace({
  currentUserId,
  role,
}: Props) {
  const isTrainer = role === "trainer";

  const [data, setData] = useState<ApiData>({
    feedback: [],
    replies: [],
    profiles: [],
    assignments: [],
    role,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FeedbackForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [recipientFilter, setRecipientFilter] = useState("all");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    try {
      const result = (await feedbackRequest("GET")) as ApiData;

      setData(result);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load feedback."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const profileMap = useMemo(
    () => new Map(data.profiles.map((profile) => [profile.id, profile])),
    [data.profiles]
  );

  const teamLeaders = useMemo(
    () =>
      data.profiles.filter(
        (profile) => profile.role === "team_leader"
      ),
    [data.profiles]
  );

  const availableAgents = useMemo(() => {
    if (!form.teamLeaderId) {
      return [];
    }

    const assignedIds = new Set(
      data.assignments
        .filter(
          (assignment) =>
            assignment.team_leader_id === form.teamLeaderId
        )
        .map((assignment) => assignment.learner_id)
    );

    return data.profiles.filter(
      (profile) =>
        profile.role === "learner" && assignedIds.has(profile.id)
    );
  }, [data.assignments, data.profiles, form.teamLeaderId]);

  const filteredFeedback = useMemo(() => {
    const query = search.trim().toLowerCase();

    return data.feedback.filter((item) => {
      if (
        isTrainer &&
        recipientFilter !== "all" &&
        item.team_leader_id !== recipientFilter
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const author = getDisplayName(profileMap.get(item.author_id));
      const recipient = getDisplayName(
        profileMap.get(item.team_leader_id)
      );
      const agent = item.learner_id
        ? getDisplayName(profileMap.get(item.learner_id))
        : "";

      return [
        item.title,
        item.content,
        author,
        recipient,
        agent,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [
    data.feedback,
    isTrainer,
    recipientFilter,
    search,
    profileMap,
  ]);

  function openCreate() {
    setForm(emptyForm);
    setShowForm(true);
    setError("");
  }

  function openEdit(item: Feedback) {
    setForm({
      id: item.id,
      teamLeaderId: item.team_leader_id,
      learnerId: item.learner_id ?? "",
      title: item.title,
      content: item.content,
    });

    setShowForm(true);
    setError("");
  }

  async function saveFeedback(event: React.FormEvent) {
    event.preventDefault();

    if (!form.title.trim() || !form.content.trim()) {
      setError("Title and feedback are required.");
      return;
    }

    if (!form.id && !form.teamLeaderId) {
      setError("Select a Team Leader.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (form.id) {
        await feedbackRequest("PATCH", {
          id: form.id,
          title: form.title,
          content: form.content,
        });
      } else {
        await feedbackRequest("POST", {
          teamLeaderId: form.teamLeaderId,
          learnerId: form.learnerId || null,
          title: form.title,
          content: form.content,
        });
      }

      setShowForm(false);
      setForm(emptyForm);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save feedback."
      );
    } finally {
      setSaving(false);
    }
  }

  async function sendReply(feedbackId: string) {
    const content = replyDrafts[feedbackId]?.trim();

    if (!content) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await feedbackRequest("POST", {
        action: "reply",
        feedbackId,
        content,
      });

      setReplyDrafts((current) => ({
        ...current,
        [feedbackId]: "",
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

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">
            {isTrainer ? "Feedback for Team Leaders" : "Trainer Feedback"}
          </h2>

          <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
            {isTrainer
              ? "Share feedback with Team Leaders and follow up on their responses."
              : "Review feedback from Training and reply to any questions or observations."}
          </p>
        </div>

        {isTrainer && (
          <button
            type="button"
            onClick={openCreate}
            className="min-h-10 rounded-[10px] bg-[#08A9C1] px-4 text-[11px] font-semibold text-white hover:bg-[#078FA4]"
          >
            + New Feedback
          </button>
        )}
      </div>

      {isTrainer && (
        <div className="flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search feedback..."
            className="min-h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-[12px] outline-none focus:border-[#08A9C1] sm:w-[240px]"
          />

          <select
            value={recipientFilter}
            onChange={(event) =>
              setRecipientFilter(event.target.value)
            }
            className="min-h-10 rounded-[10px] border border-[var(--border)] bg-white px-3 text-[12px]"
          >
            <option value="all">All Team Leaders</option>

            {teamLeaders.map((leader) => (
              <option key={leader.id} value={leader.id}>
                {getDisplayName(leader)}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
          {error}
        </div>
      )}

      {isTrainer && showForm && (
        <form
          onSubmit={saveFeedback}
          className="space-y-4 rounded-[17px] border border-[#08A9C1]/30 bg-white p-5 shadow-[var(--shadow-xs)]"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold">
              {form.id ? "Edit Feedback" : "New Feedback"}
            </h3>

            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-[20px] text-[var(--text-muted)]"
              aria-label="Close form"
            >
              ×
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold">
                Team Leader *
              </span>

              <select
                required
                disabled={Boolean(form.id)}
                value={form.teamLeaderId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    teamLeaderId: event.target.value,
                    learnerId: "",
                  }))
                }
                className="min-h-11 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-[12px] disabled:bg-slate-50"
              >
                <option value="">Select Team Leader</option>

                {teamLeaders.map((leader) => (
                  <option key={leader.id} value={leader.id}>
                    {getDisplayName(leader)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold">
                Related Agent (Optional)
              </span>

              <select
                disabled={!form.teamLeaderId || Boolean(form.id)}
                value={form.learnerId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    learnerId: event.target.value,
                  }))
                }
                className="min-h-11 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-[12px] disabled:bg-slate-50"
              >
                <option value="">General feedback</option>

                {availableAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {getDisplayName(agent)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold">
              Title *
            </span>

            <input
              required
              maxLength={200}
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              className="min-h-11 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-[12px]"
              placeholder="e.g. Week 1 — Call Handling Feedback"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold">
              Feedback *
            </span>

            <textarea
              required
              rows={6}
              maxLength={20000}
              value={form.content}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  content: event.target.value,
                }))
              }
              className="w-full resize-y rounded-[10px] border border-[var(--border)] bg-white px-3 py-3 text-[12px] leading-5"
              placeholder="Write your observations, recommendations, or follow-up information..."
            />
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="min-h-10 rounded-[10px] border border-[var(--border)] px-4 text-[11px] font-semibold"
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
                  : "Publish Feedback"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="rounded-[16px] border border-[var(--border)] bg-white p-8 text-center text-[12px] text-[var(--text-muted)]">
          Loading feedback...
        </div>
      ) : filteredFeedback.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-[var(--border)] bg-white p-8 text-center">
          <p className="text-[13px] font-semibold">
            No feedback yet
          </p>
          <p className="mt-2 text-[12px] text-[var(--text-muted)]">
            {isTrainer
              ? "Published feedback will appear here."
              : "Feedback from your Training team will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFeedback.map((item) => {
            const itemReplies = data.replies.filter(
              (reply) => reply.feedback_id === item.id
            );

            const canEdit =
              isTrainer && item.author_id === currentUserId;

            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-[17px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]"
              >
                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                        {getDisplayName(profileMap.get(item.author_id))}
                      </p>

                      <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                        {formatDate(item.created_at)}
                      </p>
                    </div>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="text-[11px] font-semibold text-[#07879B]"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#EAF8FA] px-2.5 py-1 text-[10px] font-semibold text-[#07879B]">
                      To: {getDisplayName(profileMap.get(item.team_leader_id))}
                    </span>

                    {item.learner_id && (
                      <span className="rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[10px] font-medium text-[var(--text-secondary)]">
                        Agent:{" "}
                        {getDisplayName(profileMap.get(item.learner_id))}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-4 text-[15px] font-semibold text-[var(--text-primary)]">
                    {item.title}
                  </h3>

                  <p className="mt-3 whitespace-pre-wrap text-[12px] leading-6 text-[var(--text-secondary)]">
                    {item.content}
                  </p>
                </div>

                <div className="border-t border-[var(--border-soft)] bg-[#FAFCFC] px-5 py-5 sm:px-6">
                  <p className="text-[11px] font-semibold text-[var(--text-primary)]">
                    Conversation ({itemReplies.length})
                  </p>

                  <div className="mt-4 space-y-3">
                    {itemReplies.length === 0 ? (
                      <p className="text-[11px] text-[var(--text-muted)]">
                        No replies yet.
                      </p>
                    ) : (
                      itemReplies.map((reply) => (
                        <div
                          key={reply.id}
                          className="rounded-[11px] border border-[var(--border-soft)] bg-white p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold text-[#07879B]">
                              {getDisplayName(
                                profileMap.get(reply.author_id)
                              )}
                            </p>

                            <p className="text-[10px] text-[var(--text-muted)]">
                              {formatDate(reply.created_at)}
                            </p>
                          </div>

                          <p className="mt-2 whitespace-pre-wrap text-[12px] leading-5 text-[var(--text-secondary)]">
                            {reply.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-4">
                    <textarea
                      rows={3}
                      maxLength={10000}
                      value={replyDrafts[item.id] ?? ""}
                      onChange={(event) =>
                        setReplyDrafts((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                      placeholder="Write a reply..."
                      className="w-full resize-y rounded-[10px] border border-[var(--border)] bg-white px-3 py-3 text-[12px] leading-5 outline-none focus:border-[#08A9C1]"
                    />

                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        disabled={
                          saving || !replyDrafts[item.id]?.trim()
                        }
                        onClick={() => sendReply(item.id)}
                        className="min-h-9 rounded-[9px] bg-[#08A9C1] px-4 text-[11px] font-semibold text-white disabled:opacity-50"
                      >
                        Send Reply
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}