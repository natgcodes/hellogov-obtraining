"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type ReviewRecord = {
  id: string;
  waveId: string;
  quizTitle: string;
  learnerName: string;
  learnerEmail: string;
  accountStatus: "active" | "deactivated";
  attemptNumber: number;
  maxAttempts: number | null;
  isCheckpoint: boolean;
  dayNumber: number | null;
  submittedAt: string | null;
  gradedAt: string | null;
  score: number | null;
  passed: boolean | null;
  pendingAnswers: number;
  gradingMethod: "manual" | "automatic" | null;
  reviewerName: string | null;
  reviewerEmail: string | null;
  status: "needs_review" | "graded" | "cancelled";
};

type ReviewWave = {
  id: string;
  title: string;
};

type Props = {
  pending: ReviewRecord[];
  history: ReviewRecord[];
  waves: ReviewWave[];
};

type SectionKey =
  | "pending"
  | "manual"
  | "automatic"
  | "previous"
  | "cancelled"
  | "deactivated";

type Accent = "amber" | "teal" | "emerald" | "slate";

type DateFilter =
  | "all"
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "custom";

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

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateDaysAgo(days: number) {
  const date = new Date();

  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);

  return getLocalDateKey(date);
}

function matchesDateFilter(
  submittedAt: string | null,
  dateFilter: DateFilter,
  startDate: string,
  endDate: string
) {
  if (dateFilter === "all") return true;

  if (!submittedAt) return false;

  const date = new Date(submittedAt);

  if (Number.isNaN(date.getTime())) return false;

  const recordDate = getLocalDateKey(date);

  switch (dateFilter) {
    case "today":
      return recordDate === getDateDaysAgo(0);

    case "yesterday":
      return recordDate === getDateDaysAgo(1);

    case "last7":
      return (
        recordDate >= getDateDaysAgo(6) &&
        recordDate <= getDateDaysAgo(0)
      );

    case "last30":
      return (
        recordDate >= getDateDaysAgo(29) &&
        recordDate <= getDateDaysAgo(0)
      );

    case "custom":
      return (
        (!startDate || recordDate >= startDate) &&
        (!endDate || recordDate <= endDate)
      );

    default:
      return true;
  }
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

function ResultBadge({
  passed,
}: {
  passed: boolean | null;
}) {
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

function ReviewRow({
  record,
  showWave,
  waveTitle,
}: {
  record: ReviewRecord;
  showWave: boolean;
  waveTitle: string;
}) {
  const isPending = record.status === "needs_review";
  const isCancelled = record.status === "cancelled";

  const rowContent = (
    <div className="flex items-start justify-between gap-3">
      {/* LEFT SIDE */}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={`min-w-0 break-words text-[13px] font-semibold ${
              isCancelled
                ? "text-[var(--text-secondary)]"
                : "text-[var(--text-primary)] transition-colors group-hover:text-[var(--teal)]"
            }`}
          >
            {record.quizTitle}
          </p>

          {showWave && (
            <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">
              {waveTitle}
            </span>
          )}

          {record.isCheckpoint && (
            <span className="shrink-0 rounded-[6px] bg-[#EAF8FA] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#07879B]">
              CHECKPOINT
            </span>
          )}

          {record.dayNumber !== null && (
            <span className="shrink-0 rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
              Day {record.dayNumber}
            </span>
          )}

          {isCancelled && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
              Quiz Cancelled
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
              isPending || isCancelled
                ? record.submittedAt
                : record.gradedAt
            )}
          </span>
        </div>

        {/* REVIEWER INFORMATION */}

        {!isPending &&
          !isCancelled &&
          record.gradingMethod === "manual" && (
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
        {isCancelled ? (
          <>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
              Cancelled
            </span>

            <span className="text-[13px] font-semibold text-[var(--text-secondary)]">
              {record.score === null
                ? "—"
                : `${Number(record.score).toFixed(0)}%`}
            </span>
          </>
        ) : isPending ? (
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

        {!isCancelled && (
          <span className="text-lg text-[var(--text-muted)] transition-colors group-hover:text-[var(--teal)]">
            →
          </span>
        )}
      </div>
    </div>
  );

  if (isCancelled) {
    return (
      <div className="border-b border-[var(--border-soft)] bg-slate-50/50 px-4 py-4 last:border-b-0 sm:px-5">
        {rowContent}
      </div>
    );
  }

  return (
    <Link
      href={`/trainer/review/${record.id}`}
      className="group block border-b border-[var(--border-soft)] px-4 py-4 transition-colors last:border-b-0 hover:bg-[var(--surface-soft)] sm:px-5"
    >
      {rowContent}
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
  showWave,
  waveTitleMap,
}: {
  title: string;
  description: string;
  records: ReviewRecord[];
  sectionKey: SectionKey;
  expanded: boolean;
  onToggle: (key: SectionKey) => void;
  accent: Accent;
  emptyMessage: string;
  showWave: boolean;
  waveTitleMap: Map<string, string>;
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
            <ReviewRow
              key={record.id}
              record={record}
              showWave={showWave}
              waveTitle={
                waveTitleMap.get(record.waveId) ??
                "Unknown Wave"
              }
            />
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
  waves,
}: Props) {
  // ============================================================
  // WAVE FILTER
  // Newest wave is selected by default.
  // ============================================================

  const defaultWaveId = waves[0]?.id ?? "all";

  const [waveFilter, setWaveFilter] = useState(defaultWaveId);

  const waveTitleMap = useMemo(
    () =>
      new Map(
        waves.map((wave) => [wave.id, wave.title])
      ),
    [waves]
  );

  const [search, setSearch] = useState("");

  // TRAINING DAY FILTER

  const [dayFilter, setDayFilter] = useState("all");

  // EXISTING FILTERS

  const [typeFilter, setTypeFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");

  // DATE FILTER

  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [expanded, setExpanded] = useState<
    Record<SectionKey, boolean>
  >({
    pending: false,
    manual: false,
    automatic: false,
    previous: false,
    cancelled: false,
    deactivated: false,
  });

  function toggleSection(key: SectionKey) {
    setExpanded((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  // ============================================================
  // AVAILABLE TRAINING DAYS
  // ============================================================

  const availableDays = useMemo(() => {
    return [
      ...new Set(
        [...pending, ...history]
          .filter(
            (record) =>
              waveFilter === "all" ||
              record.waveId === waveFilter
          )
          .map((record) => record.dayNumber)
          .filter(
            (day): day is number => day !== null
          )
      ),
    ].sort((a, b) => a - b);
  }, [pending, history, waveFilter]);

  // ============================================================
  // FILTER RECORDS
  // ============================================================

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...pending, ...history].filter((record) => {
      const matchesWave =
        waveFilter === "all" ||
        record.waveId === waveFilter;

      const matchesSearch =
        !query ||
        [
          record.quizTitle,
          record.learnerName,
          record.learnerEmail,
          record.reviewerName ?? "",
          record.reviewerEmail ?? "",
          waveTitleMap.get(record.waveId) ?? "",
          record.dayNumber !== null
            ? `Day ${record.dayNumber}`
            : "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesDay =
        dayFilter === "all" ||
        record.dayNumber === Number(dayFilter);

      const matchesAccount =
        accountFilter === "all" ||
        record.accountStatus === accountFilter;

      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "checkpoint" &&
          record.isCheckpoint) ||
        (typeFilter === "quiz" &&
          !record.isCheckpoint);

      const matchesResult =
        resultFilter === "all" ||
        (resultFilter === "pending" &&
          record.status === "needs_review") ||
        (resultFilter === "passed" &&
          record.status === "graded" &&
          record.passed === true) ||
        (resultFilter === "failed" &&
          record.status === "graded" &&
          record.passed === false) ||
        (resultFilter === "cancelled" &&
          record.status === "cancelled");

      const matchesDate = matchesDateFilter(
        record.submittedAt,
        dateFilter,
        startDate,
        endDate
      );

      return (
        matchesWave &&
        matchesSearch &&
        matchesDay &&
        matchesAccount &&
        matchesType &&
        matchesResult &&
        matchesDate
      );
    });
  }, [
    pending,
    history,
    waveFilter,
    waveTitleMap,
    search,
    dayFilter,
    accountFilter,
    typeFilter,
    resultFilter,
    dateFilter,
    startDate,
    endDate,
  ]);

  // ============================================================
  // GROUP RECORDS
  // ============================================================

  const activeRecords = filtered.filter(
    (record) =>
      record.accountStatus !== "deactivated"
  );

  const deactivatedRecords = filtered.filter(
    (record) =>
      record.accountStatus === "deactivated"
  );

  const pendingRecords = activeRecords.filter(
    (record) =>
      record.status === "needs_review"
  );

  const manualRecords = activeRecords.filter(
    (record) =>
      record.status === "graded" &&
      record.gradingMethod === "manual"
  );

  const automaticRecords = activeRecords.filter(
    (record) =>
      record.status === "graded" &&
      record.gradingMethod === "automatic"
  );

  const previousRecords = activeRecords.filter(
    (record) =>
      record.status === "graded" &&
      record.gradingMethod === null
  );

  const cancelledRecords = activeRecords.filter(
    (record) =>
      record.status === "cancelled"
  );

  // ============================================================
  // SUMMARY COUNTS
  // ============================================================

  const pendingCount = pendingRecords.length;
  const manualCount = manualRecords.length;
  const automaticCount = automaticRecords.length;
  const previousCount = previousRecords.length;
  const cancelledCount = cancelledRecords.length;
  const deactivatedCount = deactivatedRecords.length;

  const hasFilters =
    waveFilter !== defaultWaveId ||
    search.trim() !== "" ||
    dayFilter !== "all" ||
    typeFilter !== "all" ||
    accountFilter !== "all" ||
    resultFilter !== "all" ||
    dateFilter !== "all" ||
    startDate !== "" ||
    endDate !== "";

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
    {
      label: "Quiz Cancelled",
      value: cancelledCount,
      color: "text-slate-600",
    },
    {
      label: "Deactivated Learners",
      value: deactivatedCount,
      color: "text-slate-600",
    },
  ];

  // ============================================================
  // CLEAR FILTERS
  // ============================================================

  function clearFilters() {
    setWaveFilter(defaultWaveId);
    setSearch("");
    setDayFilter("all");
    setTypeFilter("all");
    setAccountFilter("all");
    setResultFilter("all");
    setDateFilter("all");
    setStartDate("");
    setEndDate("");
  }

  return (
    <div>
      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <div
        className={`mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 ${
          summaryCards.length === 3
            ? "lg:grid-cols-3"
            : summaryCards.length === 4
              ? "lg:grid-cols-4"
              : "lg:grid-cols-5"
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
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">

          {/* WAVE FILTER */}

          <select
            value={waveFilter}
            onChange={(event) => {
              setWaveFilter(event.target.value);
              setDayFilter("all");
            }}
            aria-label="Filter by onboarding wave"
            className="rounded-[10px] border border-[var(--border)] bg-white px-4 py-3 text-[13px] font-semibold text-[var(--text-primary)] outline-none transition focus:border-[#08A9C1]"
          >
            <option value="all">All Waves</option>

            {waves.map((wave) => (
              <option
                key={wave.id}
                value={wave.id}
              >
                {wave.title}
              </option>
            ))}
          </select>

          {/* SEARCH */}

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search learner, email, assessment, or trainer..."
            aria-label="Search reviews"
            className="min-w-0 flex-1 rounded-[10px] border border-[var(--border)] bg-[#FAFBFC] px-4 py-3 text-[13px] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[#08A9C1] focus:bg-white focus:ring-2 focus:ring-[#08A9C1]/10"
          />

          {/* TRAINING DAY FILTER */}

          <select
            value={dayFilter}
            onChange={(event) =>
              setDayFilter(event.target.value)
            }
            aria-label="Filter by training day"
            className="rounded-[10px] border border-[var(--border)] bg-white px-4 py-3 text-[13px] text-[var(--text-secondary)] outline-none transition focus:border-[#08A9C1]"
          >
            <option value="all">All days</option>

            {availableDays.map((day) => (
              <option
                key={day}
                value={String(day)}
              >
                Day {day}
              </option>
            ))}
          </select>

          {/* ACCOUNT FILTER */}

          <select
            value={accountFilter}
            onChange={(event) =>
              setAccountFilter(event.target.value)
            }
            aria-label="Filter by account status"
            className="rounded-[10px] border border-[var(--border)] bg-white px-4 py-3 text-[13px] text-[var(--text-secondary)] outline-none transition focus:border-[#08A9C1]"
          >
            <option value="all">All accounts</option>
            <option value="active">Active accounts</option>
            <option value="deactivated">
              Deactivated accounts
            </option>
          </select>

          {/* ASSESSMENT TYPE FILTER */}

          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value)
            }
            aria-label="Filter assessment type"
            className="rounded-[10px] border border-[var(--border)] bg-white px-4 py-3 text-[13px] text-[var(--text-secondary)] outline-none transition focus:border-[#08A9C1]"
          >
            <option value="all">All assessments</option>
            <option value="quiz">Quizzes</option>
            <option value="checkpoint">
              Checkpoints
            </option>
          </select>

          {/* RESULT FILTER */}

          <select
            value={resultFilter}
            onChange={(event) =>
              setResultFilter(event.target.value)
            }
            aria-label="Filter result"
            className="rounded-[10px] border border-[var(--border)] bg-white px-4 py-3 text-[13px] text-[var(--text-secondary)] outline-none transition focus:border-[#08A9C1]"
          >
            <option value="all">All results</option>
            <option value="pending">Pending</option>
            <option value="passed">Passed</option>
            <option value="failed">Not passed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* DATE FILTER */}

          <select
            value={dateFilter}
            onChange={(event) =>
              setDateFilter(
                event.target.value as DateFilter
              )
            }
            aria-label="Filter by submission date"
            className="rounded-[10px] border border-[var(--border)] bg-white px-4 py-3 text-[13px] text-[var(--text-secondary)] outline-none transition focus:border-[#08A9C1]"
          >
            <option value="all">All dates</option>
            <option value="today">Today</option>
            <option value="yesterday">
              Yesterday
            </option>
            <option value="last7">
              Last 7 days
            </option>
            <option value="last30">
              Last 30 days
            </option>
            <option value="custom">
              Custom range
            </option>
          </select>

          {/* CLEAR FILTERS */}

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-[10px] px-4 py-3 text-[12px] font-semibold text-[#07879B] transition hover:bg-[#EAF8FA]"
            >
              Clear
            </button>
          )}
        </div>

        {/* ======================================================
            CUSTOM DATE RANGE
        ====================================================== */}

        {dateFilter === "custom" && (
          <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-[var(--border-soft)] pt-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="review-start-date"
                className="text-[11px] font-medium text-[var(--text-secondary)]"
              >
                From
              </label>

              <input
                id="review-start-date"
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) =>
                  setStartDate(event.target.value)
                }
                className="rounded-[10px] border border-[var(--border)] bg-white px-4 py-2.5 text-[13px] text-[var(--text-primary)] outline-none focus:border-[#08A9C1]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="review-end-date"
                className="text-[11px] font-medium text-[var(--text-secondary)]"
              >
                To
              </label>

              <input
                id="review-end-date"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) =>
                  setEndDate(event.target.value)
                }
                className="rounded-[10px] border border-[var(--border)] bg-white px-4 py-2.5 text-[13px] text-[var(--text-primary)] outline-none focus:border-[#08A9C1]"
              />
            </div>

            <p className="pb-2 text-[11px] text-[var(--text-muted)]">
              Filter assessments by submission date.
            </p>
          </div>
        )}
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
            showWave={waveFilter === "all"}
            waveTitleMap={waveTitleMap}
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
            showWave={waveFilter === "all"}
            waveTitleMap={waveTitleMap}
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
            showWave={waveFilter === "all"}
            waveTitleMap={waveTitleMap}
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
              showWave={waveFilter === "all"}
              waveTitleMap={waveTitleMap}
              emptyMessage={
                hasFilters
                  ? "No historical assessments match your filters."
                  : "No historical assessments found."
              }
            />
          )}

          <ReviewSection
            title="Deactivated Learners"
            description="Assessment history for deactivated learners, including submissions still awaiting review. Original quiz statuses and grades are preserved."
            records={deactivatedRecords}
            sectionKey="deactivated"
            expanded={expanded.deactivated}
            onToggle={toggleSection}
            accent="slate"
            showWave={waveFilter === "all"}
            waveTitleMap={waveTitleMap}
            emptyMessage={
              hasFilters
                ? "No deactivated learner assessments match your filters."
                : "No assessments from deactivated learners found."
            }
          />

          <ReviewSection
            title="Quiz Cancelled"
            description="Cancelled attempts kept for historical reference. These submissions cannot be opened or graded."
            records={cancelledRecords}
            sectionKey="cancelled"
            expanded={expanded.cancelled}
            onToggle={toggleSection}
            accent="slate"
            showWave={waveFilter === "all"}
            waveTitleMap={waveTitleMap}
            emptyMessage={
              hasFilters
                ? "No cancelled assessments match your filters."
                : "No cancelled assessments found."
            }
          />
        </div>
      </div>
    </div>
  );
}