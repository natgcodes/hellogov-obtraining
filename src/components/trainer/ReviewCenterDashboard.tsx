"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type ReviewRecord = {
  id: string;
  quizTitle: string;
  learnerName: string;
  learnerEmail: string;
  attemptNumber: number;
  maxAttempts: number | null;
  isCheckpoint: boolean;
  submittedAt: string | null;
  gradedAt: string | null;
  score: number | null;
  passed: boolean | null;
  pendingAnswers: number;
  gradingMethod: "manual" | "automatic" | null;
  reviewerName: string | null;
  reviewerEmail: string | null;
  status: "needs_review" | "graded";
};

type Props = {
  pending: ReviewRecord[];
  history: ReviewRecord[];
};

type SectionKey = "pending" | "manual" | "automatic" | "previous";

type Accent = "amber" | "teal" | "emerald" | "slate";

const PAGE_SIZE = 5;

// ============================================================
// HELPERS
// ============================================================

function formatDate(value: string | null) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatAttempt(record: ReviewRecord) {
  if (
    record.maxAttempts === null ||
    record.maxAttempts < record.attemptNumber
  ) {
    return `Attempt ${record.attemptNumber}`;
  }

  return `Attempt ${record.attemptNumber} of ${record.maxAttempts}`;
}

// ============================================================
// RESULT BADGE
// ============================================================

function ResultBadge({ passed }: { passed: boolean | null }) {
  if (passed === null) return null;

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
        passed
          ? "bg-emerald-50 text-emerald-700"
          : "bg-rose-50 text-rose-700"
      }`}
    >
      {passed ? "Passed" : "Not passed"}
    </span>
  );
}

// ============================================================
// REVIEW ROW
// ============================================================

function ReviewRow({ record }: { record: ReviewRecord }) {
  const isPending = record.status === "needs_review";

  return (
    <Link
      href={`/trainer/review/${record.id}`}
      className="group block border-b border-[var(--border-soft)] px-4 py-4 transition-colors last:border-b-0 hover:bg-[var(--surface-soft)] sm:px-5"
    >
      <div className="flex items-start justify-between gap-3">
        {/* LEFT SIDE */}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 break-words text-[13px] font-semibold text-[var(--text-primary)] transition-colors group-hover:text-[var(--teal)]">
              {record.quizTitle}
            </p>

            {record.isCheckpoint && (
              <span className="shrink-0 rounded-[6px] bg-[#EAF8FA] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#07879B]">
                CHECKPOINT
              </span>
            )}
          </div>

          <p className="mt-1 truncate text-[12px] text-[var(--text-secondary)]">
            {record.learnerName}
          </p>

          {record.learnerEmail && (
            <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
              {record.learnerEmail}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)]">
            <span>{formatAttempt(record)}</span>

            <span>
              {formatDate(
                isPending ? record.submittedAt : record.gradedAt
              )}
            </span>
          </div>

          {/* REVIEWER INFORMATION */}

          {!isPending && record.gradingMethod === "manual" && (
            <p className="mt-2 text-[11px] text-[var(--text-secondary)]">
              Reviewed by{" "}
              <span className="font-semibold text-[var(--text-primary)]">
                {record.reviewerName ||
                  record.reviewerEmail ||
                  "Trainer unavailable"}
              </span>
            </p>
          )}
        </div>

        {/* RIGHT SIDE */}

        <div className="flex shrink-0 flex-col items-end gap-2">
          {isPending ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
              {record.pendingAnswers} pending
            </span>
          ) : (
            <>
              <ResultBadge passed={record.passed} />

              <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                {record.score === null
                  ? "—"
                  : `${Number(record.score).toFixed(0)}%`}
              </span>
            </>
          )}

          <span className="text-lg text-[var(--text-muted)] transition-colors group-hover:text-[var(--teal)]">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}

// ============================================================
// REVIEW SECTION
// ============================================================

function ReviewSection({
  title,
  description,
  records,
  sectionKey,
  expanded,
  onToggle,
  accent,
  emptyMessage,
}: {
  title: string;
  description: string;
  records: ReviewRecord[];
  sectionKey: SectionKey;
  expanded: boolean;
  onToggle: (key: SectionKey) => void;
  accent: Accent;
  emptyMessage: string;
}) {
  const visible = expanded
    ? records
    : records.slice(0, PAGE_SIZE);

  const accents: Record<Accent, string> = {
    amber: "bg-amber-50 text-amber-700",
    teal: "bg-[#EAF8FA] text-[#07879B]",
    emerald: "bg-emerald-50 text-emerald-700",
    slate: "bg-[#F2F4F7] text-[var(--text-secondary)]",
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-[18px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
      {/* SECTION HEADER */}

      <div className="border-b border-[var(--border-soft)] px-4 py-5 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
            {title}
          </h2>

          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${accents[accent]}`}
          >
            {records.length}
          </span>
        </div>

        <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">
          {description}
        </p>
      </div>

      {/* SECTION CONTENT */}

      {visible.length > 0 ? (
        <div>
          {visible.map((record) => (
            <ReviewRow key={record.id} record={record} />
          ))}
        </div>
      ) : (
        <div className="px-5 py-10 text-center">
          <p className="text-[12px] text-[var(--text-muted)]">
            {emptyMessage}
          </p>
        </div>
      )}

      {/* SHOW MORE / SHOW LESS */}

      {records.length > PAGE_SIZE && (
        <div className="border-t border-[var(--border-soft)] px-4 py-3 text-center">
          <button
            type="button"
            onClick={() => onToggle(sectionKey)}
            className="rounded-[9px] px-4 py-2 text-[12px] font-semibold text-[#07879B] transition hover:bg-[#EAF8FA]"
          >
            {expanded
              ? "Show Less"
              : `Show More (${records.length - PAGE_SIZE} remaining)`}
          </button>
        </div>
      )}
    </section>
  );
}

// ============================================================
// MAIN DASHBOARD
// ============================================================

export default function ReviewCenterDashboard({
  pending,
  history,
}: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");

  const [expanded, setExpanded] = useState<
    Record<SectionKey, boolean>
  >({
    pending: false,
    manual: false,
    automatic: false,
    previous: false,
  });

  function toggleSection(key: SectionKey) {
    setExpanded((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  // ============================================================
  // FILTER RECORDS
  // ============================================================

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...pending, ...history].filter((record) => {
      const matchesSearch =
        !query ||
        [
          record.quizTitle,
          record.learnerName,
          record.learnerEmail,
          record.reviewerName ?? "",
          record.reviewerEmail ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "checkpoint" && record.isCheckpoint) ||
        (typeFilter === "quiz" && !record.isCheckpoint);

      const matchesResult =
        resultFilter === "all" ||
        (resultFilter === "pending" &&
          record.status === "needs_review") ||
        (resultFilter === "passed" &&
          record.status === "graded" &&
          record.passed === true) ||
        (resultFilter === "failed" &&
          record.status === "graded" &&
          record.passed === false);

      return matchesSearch && matchesType && matchesResult;
    });
  }, [pending, history, search, typeFilter, resultFilter]);

  // ============================================================
  // GROUP RECORDS
  // ============================================================

  const pendingRecords = filtered.filter(
    (record) => record.status === "needs_review"
  );

  const manualRecords = filtered.filter(
    (record) =>
      record.status === "graded" &&
      record.gradingMethod === "manual"
  );

  const automaticRecords = filtered.filter(
    (record) =>
      record.status === "graded" &&
      record.gradingMethod === "automatic"
  );

  const previousRecords = filtered.filter(
    (record) =>
      record.status === "graded" &&
      record.gradingMethod === null
  );

  // ============================================================
  // SUMMARY COUNTS
  // ============================================================

  const pendingCount = pending.length;

  const manualCount = history.filter(
    (record) =>
      record.status === "graded" &&
      record.gradingMethod === "manual"
  ).length;

  const automaticCount = history.filter(
    (record) =>
      record.status === "graded" &&
      record.gradingMethod === "automatic"
  ).length;

  const previousCount = history.filter(
    (record) =>
      record.status === "graded" &&
      record.gradingMethod === null
  ).length;

  const hasFilters =
    search.trim() !== "" ||
    typeFilter !== "all" ||
    resultFilter !== "all";

  // ============================================================
  // SUMMARY CARDS
  // ============================================================

  const summaryCards = [
    {
      label: "Needs Review",
      value: pendingCount,
      color: "text-amber-700",
    },
    {
      label: "Manually Reviewed",
      value: manualCount,
      color: "text-[#07879B]",
    },
    {
      label: "Automatically Graded",
      value: automaticCount,
      color: "text-emerald-700",
    },
    ...(previousCount > 0
      ? [
          {
            label: "Previous History",
            value: previousCount,
            color: "text-[var(--text-secondary)]",
          },
        ]
      : []),
  ];

  return (
    <div>
      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <div
        className={`mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 ${
          summaryCards.length === 3
            ? "lg:grid-cols-3"
            : "lg:grid-cols-4"
        }`}
      >
        {summaryCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[18px] border border-[var(--border)] bg-white px-5 py-5 shadow-[var(--shadow-xs)]"
          >
            <p className="text-[12px] font-medium text-[var(--text-secondary)]">
              {stat.label}
            </p>

            <p
              className={`mt-2 text-[30px] font-semibold tracking-[-0.04em] ${stat.color}`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* ======================================================
          SEARCH AND FILTERS
      ====================================================== */}

      <div className="mt-6 rounded-[18px] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-xs)]">
        <div className="flex flex-col gap-3 lg:flex-row">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search learner, email, assessment, or trainer..."
            aria-label="Search reviews"
            className="min-w-0 flex-1 rounded-[10px] border border-[var(--border)] bg-[#FAFBFC] px-4 py-3 text-[13px] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[#08A9C1] focus:bg-white focus:ring-2 focus:ring-[#08A9C1]/10"
          />

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            aria-label="Filter assessment type"
            className="rounded-[10px] border border-[var(--border)] bg-white px-4 py-3 text-[13px] text-[var(--text-secondary)] outline-none transition focus:border-[#08A9C1]"
          >
            <option value="all">All assessments</option>
            <option value="quiz">Quizzes</option>
            <option value="checkpoint">Checkpoints</option>
          </select>

          <select
            value={resultFilter}
            onChange={(event) => setResultFilter(event.target.value)}
            aria-label="Filter result"
            className="rounded-[10px] border border-[var(--border)] bg-white px-4 py-3 text-[13px] text-[var(--text-secondary)] outline-none transition focus:border-[#08A9C1]"
          >
            <option value="all">All results</option>
            <option value="pending">Pending</option>
            <option value="passed">Passed</option>
            <option value="failed">Not passed</option>
          </select>

          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setTypeFilter("all");
                setResultFilter("all");
              }}
              className="rounded-[10px] px-4 py-3 text-[12px] font-semibold text-[#07879B] transition hover:bg-[#EAF8FA]"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ======================================================
          MAIN REVIEW COLUMNS
      ====================================================== */}

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-2">
        {/* LEFT COLUMN */}

        <div className="min-w-0 space-y-5">
          <ReviewSection
            title="Needs Review"
            description="Submissions waiting for trainer evaluation."
            records={pendingRecords}
            sectionKey="pending"
            expanded={expanded.pending}
            onToggle={toggleSection}
            accent="amber"
            emptyMessage={
              hasFilters
                ? "No pending submissions match your filters."
                : "All caught up! No submissions need review."
            }
          />

          <ReviewSection
            title="Automatically Graded"
            description="Assessments evaluated automatically by the system."
            records={automaticRecords}
            sectionKey="automatic"
            expanded={expanded.automatic}
            onToggle={toggleSection}
            accent="emerald"
            emptyMessage={
              hasFilters
                ? "No automatically graded assessments match your filters."
                : "No automatically graded assessments found."
            }
          />
        </div>

        {/* RIGHT COLUMN */}

        <div className="min-w-0 space-y-5">
          <ReviewSection
            title="Manually Reviewed"
            description="Assessments finalized by trainers."
            records={manualRecords}
            sectionKey="manual"
            expanded={expanded.manual}
            onToggle={toggleSection}
            accent="teal"
            emptyMessage={
              hasFilters
                ? "No manually reviewed assessments match your filters."
                : "No manually reviewed assessments found."
            }
          />

          {previousCount > 0 && (
            <ReviewSection
              title="Previous History"
              description="Older assessments without a recorded grading method."
              records={previousRecords}
              sectionKey="previous"
              expanded={expanded.previous}
              onToggle={toggleSection}
              accent="slate"
              emptyMessage={
                hasFilters
                  ? "No historical assessments match your filters."
                  : "No historical assessments found."
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}