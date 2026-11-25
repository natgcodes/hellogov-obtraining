"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

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

type Attachment = { id: string; feedback_id: string; file_name: string; file_size: number };
type PendingAttachment = { id: string; file: File };

function fileSize(bytes: number) {
  return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
}

type ApiData = {
  attachments: Attachment[];
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
): Promise<ApiData | { success: boolean; feedbackId?: string; registered?: boolean }> {
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
    attachments: [],
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
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([]);
  const [uploadStatus, setUploadStatus] = useState("");
  const [notice, setNotice] = useState("");
  const publicationId = useRef<string | null>(null);
  const saveLock = useRef(false);
  const [search, setSearch] = useState("");
  const [recipientFilter, setRecipientFilter] = useState("all");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  // Track which feedback publications are expanded.
  // All publications are collapsed by default.
  const [expandedFeedback, setExpandedFeedback] = useState<
    Record<string, boolean>
  >({});

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

  function toggleFeedback(feedbackId: string) {
    setExpandedFeedback((current) => ({
      ...current,
      [feedbackId]: !current[feedbackId],
    }));
  }

  function openCreate() {
    publicationId.current = crypto.randomUUID();
    setPendingFiles([]);
    setNotice("");
    setForm(emptyForm);
    setShowForm(true);
    setError("");
  }

  function openEdit(item: Feedback) {
    publicationId.current = item.id;
    setPendingFiles([]);
    setNotice("");
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

  function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files);
    const valid = incoming.filter(file => /\.pdf$/i.test(file.name) && file.size > 0 && file.size <= 10485760 && (!file.type || file.type === "application/pdf"));
    setError(valid.length !== incoming.length ? "Only PDF files up to 10 MB are accepted." : "");
    setPendingFiles(old => [...old, ...valid.map(file => ({ id: crypto.randomUUID(), file }))]);
  }

  async function discardFile(id: string) {
    if (saveLock.current) return;
    if (form.id) {
      saveLock.current = true;
      setSaving(true);
      try {
        await feedbackRequest("POST", { action: "cleanupAttachment", feedbackId: form.id, attachmentId: id });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to discard attachment.");
        return;
      } finally {
        saveLock.current = false;
        setSaving(false);
      }
    }
    setPendingFiles(old => old.filter(item => item.id !== id));
  }

  function closeForm() {
    if (saveLock.current) return;
    if (form.id && pendingFiles.length) {
      setError("Retry or remove the pending attachments before closing this feedback.");
      return;
    }
    setPendingFiles([]);
    setShowForm(false);
  }

  async function saveFeedback(event: React.FormEvent) {
    event.preventDefault();
    if (saveLock.current) return;

    if (!form.title.trim() || !form.content.trim()) {
      setError("Title and feedback are required.");
      return;
    }

    if (!form.id && !form.teamLeaderId) {
      setError("Select a Team Leader.");
      return;
    }

    saveLock.current = true;
    setSaving(true);
    setError("");
    setNotice("");
    let feedbackId = form.id;
    try {
      // Validate before publishing text; PDFs never travel through the Next.js request body.
      for (const item of pendingFiles) {
        const header = new TextDecoder().decode(await item.file.slice(0, 5).arrayBuffer());
        if (header !== "%PDF-") throw new Error(`${item.file.name} is not a valid PDF.`);
      }
      if (feedbackId) {
        await feedbackRequest("PATCH", { id: feedbackId, title: form.title, content: form.content });
      } else {
        publicationId.current ??= crypto.randomUUID();
        const result = await feedbackRequest("POST", {
          id: publicationId.current, teamLeaderId: form.teamLeaderId,
          learnerId: form.learnerId || null, title: form.title, content: form.content,
        });
        if (!("feedbackId" in result) || !result.feedbackId) throw new Error("Feedback ID was not returned. Retry publishing.");
        feedbackId = result.feedbackId;
        setForm(current => ({ ...current, id: feedbackId }));
      }
      const storage = createClient().storage.from("feedback-attachments");
      for (let i = 0; i < pendingFiles.length; i++) {
        const item = pendingFiles[i];
        setUploadStatus(`Uploading ${i + 1} of ${pendingFiles.length}: ${item.file.name}`);
        const { error: uploadError } = await storage.upload(`${feedbackId}/${item.id}.pdf`, item.file, {
          contentType: "application/pdf", upsert: false,
        });
        // Also attempt registration when upload returns an error: a previous
        // attempt may have uploaded the object before losing its response.
        try {
          await feedbackRequest("POST", { action: "registerAttachment", feedbackId, attachmentId: item.id, fileName: item.file.name });
        } catch (err) {
          throw new Error(`${item.file.name}: ${uploadError?.message ?? (err instanceof Error ? err.message : "Unable to register PDF.")}`);
        }
        setPendingFiles(old => old.filter(file => file.id !== item.id));
      }
      setShowForm(false);
      setForm(emptyForm);
      setNotice("Feedback saved successfully.");
      await loadData();
    } catch (err) {
      if (feedbackId) await loadData();
      setError(`${feedbackId ? "Feedback text is saved. Retry or remove the remaining attachments. " : ""}${err instanceof Error ? err.message : "Unable to save feedback."}`);
    } finally {
      setUploadStatus("");
      setSaving(false);
      saveLock.current = false;
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
            disabled={saving || showForm}
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

      {notice && <div role="status" className="rounded-[12px] border border-teal-200 bg-teal-50 px-4 py-3 text-[12px] text-teal-800">{notice}</div>}

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
              onClick={closeForm}
              disabled={saving}
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

          <div className="space-y-2">
            <p className="text-[11px] font-semibold">Attachments (Optional)</p>
            {form.id && (data.attachments ?? []).filter(a => a.feedback_id === form.id).map(a => (
              <div key={a.id} className="rounded-[10px] border border-[var(--border)] px-3 py-2 text-[12px] break-all">{a.file_name} · {fileSize(a.file_size)} · Published</div>
            ))}
            {pendingFiles.map(item => (
              <div key={item.id} className="flex items-center gap-3 rounded-[10px] border border-[var(--border)] px-3 py-2">
                <span className="min-w-0 flex-1 break-all text-[12px]">{item.file.name}<span className="ml-2 text-[10px] text-[var(--text-muted)]">{fileSize(item.file.size)}</span></span>
                <button type="button" disabled={saving} onClick={() => void discardFile(item.id)} className="text-[11px] font-semibold text-red-600 disabled:opacity-50">Remove</button>
              </div>
            ))}
            <label onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!saving) addFiles(event.dataTransfer.files); }} className="block cursor-pointer rounded-[10px] border border-dashed border-[#08A9C1]/50 p-4 text-center text-[12px] text-[#07879B]">
              <span className="font-semibold">Click to upload or drag and drop</span>
              <span className="mt-1 block text-[10px] text-[var(--text-muted)]">PDF documents · Up to 10 MB per file</span>
              <input type="file" accept="application/pdf,.pdf" multiple disabled={saving} className="sr-only" onChange={event => { if (event.target.files) addFiles(event.target.files); event.target.value = ""; }} />
            </label>
            {uploadStatus && <p role="status" className="text-[11px] text-[#07879B]">{uploadStatus}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
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

            const isExpanded = expandedFeedback[item.id] === true;

            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-[17px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]"
              >
                {/* FEEDBACK HEADER */}

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
                        disabled={saving || showForm}
                        className="text-[11px] font-semibold text-[#07879B]"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {/* RECIPIENT AND AGENT */}

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

                  {/* TITLE */}

                  <h3 className="mt-4 text-[15px] font-semibold text-[var(--text-primary)]">
                    {item.title}
                  </h3>

                  {/* COLLAPSED PREVIEW / EXPANDED CONTENT */}

                  <p
                    className={`mt-3 whitespace-pre-wrap text-[12px] leading-6 text-[var(--text-secondary)] ${
                      isExpanded ? "" : "line-clamp-3"
                    }`}
                  >
                    {item.content}
                  </p>

                  {(data.attachments ?? []).some(a => a.feedback_id === item.id) && (
                    <div className="mt-4 space-y-2">
                      <p className="text-[11px] font-semibold">Attachments</p>
                      {(data.attachments ?? []).filter(a => a.feedback_id === item.id).map(a => (
                        <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-[10px] border border-[var(--border)] px-3 py-2">
                          <span className="rounded bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700">PDF</span>
                          <div className="min-w-0 flex-1 break-all text-[12px]">{a.file_name}<p className="text-[10px] text-[var(--text-muted)]">{fileSize(a.file_size)}</p></div>
                          <a href={`/api/trainer/team-leader-feedback?attachmentId=${a.id}`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-[#07879B]">View PDF</a>
                          <a href={`/api/trainer/team-leader-feedback?attachmentId=${a.id}&download=1`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-[#07879B]">Download</a>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* EXPAND / COLLAPSE CONTROLS */}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleFeedback(item.id)}
                      aria-expanded={isExpanded}
                      aria-controls={`feedback-conversation-${item.id}`}
                      className="inline-flex min-h-9 items-center gap-2 rounded-[9px] bg-[#EAF8FA] px-3 text-[11px] font-semibold text-[#07879B] transition hover:bg-[#D9F1F5]"
                    >
                      {isExpanded ? "Show Less ↑" : "Read More ↓"}
                    </button>

                    <span className="text-[11px] font-medium text-[var(--text-muted)]">
                      {itemReplies.length}{" "}
                      {itemReplies.length === 1 ? "reply" : "replies"}
                    </span>
                  </div>
                </div>

                {/* CONVERSATION — ONLY VISIBLE WHEN EXPANDED */}

                {isExpanded && (
                  <div
                    id={`feedback-conversation-${item.id}`}
                    className="border-t border-[var(--border-soft)] bg-[#FAFCFC] px-5 py-5 sm:px-6"
                  >
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

                    {/* REPLY FORM */}

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
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}