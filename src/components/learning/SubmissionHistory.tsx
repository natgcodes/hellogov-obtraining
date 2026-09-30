"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import SubmissionFilters from "./SubmissionFilters";

type SubmissionFilter =
  | "all"
  | "quiz"
  | "checkpoint";

type StatusFilter =
  | "all"
  | "passed"
  | "not_passed"
  | "pending";

export type SubmissionItem = {
  id: string;
  title: string;
  subtitle: string | null;

  dayNumber: number | null;

  type: "quiz" | "checkpoint";
  assessmentLabel: string;

  attemptNumber: number;

  score: number | null;
  passingScore: number;

  status:
    | "passed"
    | "not_passed"
    | "pending";

  submittedAt: string | null;
  gradedAt: string | null;
};

type Props = {
  submissions: SubmissionItem[];
};

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function SubmissionHistory({
  submissions,
}: Props) {
  const [typeFilter, setTypeFilter] =
    useState<SubmissionFilter>("all");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const filteredSubmissions = useMemo(
    () =>
      submissions.filter((submission) => {
        const matchesType =
          typeFilter === "all" ||
          submission.type === typeFilter;

        const matchesStatus =
          statusFilter === "all" ||
          submission.status === statusFilter;

        return matchesType && matchesStatus;
      }),
    [submissions, typeFilter, statusFilter]
  );

  return (
    <>
      {/* ===============================================
          FILTERS
      =============================================== */}

      <div className="mt-5">
        <SubmissionFilters
          typeFilter={typeFilter}
          statusFilter={statusFilter}
          onTypeChange={setTypeFilter}
          onStatusChange={setStatusFilter}
        />
      </div>

      {/* ===============================================
          EMPTY FILTER RESULT
      =============================================== */}

      {filteredSubmissions.length === 0 ? (
        <div className="mt-4 rounded-[16px] border border-dashed border-[var(--border)] bg-white px-6 py-12 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-soft)] text-[var(--text-muted)]">
            —
          </div>

          <h3 className="mt-3 text-[14px] font-semibold text-[var(--text-primary)]">
            No matching submissions
          </h3>

          <p className="mt-1 text-[12px] text-[var(--text-muted)]">
            Try changing the assessment type or
            status filter.
          </p>

          <button
            type="button"
            onClick={() => {
              setTypeFilter("all");
              setStatusFilter("all");
            }}
            className="mt-4 text-[12px] font-semibold text-[var(--teal)] transition hover:text-[var(--teal-deep)]"
          >
            Clear filters
          </button>
        </div>
      ) : (
        /* =============================================
           SUBMISSION LIST
        ============================================= */

        <div className="mt-4 overflow-hidden rounded-[16px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
          {filteredSubmissions.map(
            (submission, index) => {
              const pending =
                submission.status === "pending";

              const passed =
                submission.status === "passed";

              return (
                <article
                  key={submission.id}
                  className={`flex flex-col gap-5 px-6 py-5 sm:flex-row sm:items-center ${
                    index !== 0
                      ? "border-t border-[var(--border-soft)]"
                      : ""
                  }`}
                >
                  {/* =================================
                      LEFT
                  ================================= */}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {submission.dayNumber !==
                        null && (
                        <>
                          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                            Day{" "}
                            {submission.dayNumber}
                          </span>

                          <span
                            className="h-1 w-1 rounded-full bg-[var(--border)]"
                            aria-hidden="true"
                          />
                        </>
                      )}

                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          submission.type ===
                          "checkpoint"
                            ? "bg-[var(--teal-soft)] text-[var(--teal-deep)]"
                            : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        {submission.assessmentLabel}
                      </span>

                      {pending ? (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                          Pending review
                        </span>
                      ) : passed ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                          Passed
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-600">
                          Not passed
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 text-[15px] font-semibold tracking-[-0.015em] text-[var(--text-primary)]">
                      {submission.title}
                    </h3>

                    {submission.subtitle && (
                      <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                        {submission.subtitle}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-muted)]">
                      {submission.type ===
                        "quiz" && (
                        <>
                          <span>
                            Attempt{" "}
                            {
                              submission.attemptNumber
                            }
                          </span>

                          <span
                            className="h-1 w-1 rounded-full bg-[var(--border)]"
                            aria-hidden="true"
                          />
                        </>
                      )}

                      <span>
                        Submitted{" "}
                        {formatDate(
                          submission.submittedAt
                        )}
                      </span>

                      {submission.gradedAt && (
                        <>
                          <span
                            className="h-1 w-1 rounded-full bg-[var(--border)]"
                            aria-hidden="true"
                          />

                          <span>
                            Graded{" "}
                            {formatDate(
                              submission.gradedAt
                            )}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* =================================
                      SCORE
                  ================================= */}

                  <div className="flex shrink-0 items-center gap-6 border-t border-[var(--border-soft)] pt-4 sm:min-w-[245px] sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                    <div className="min-w-[74px] text-left sm:text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                        {pending
                          ? "Partial"
                          : "Score"}
                      </p>

                      <p
                        className={`mt-1 text-[25px] font-semibold tracking-[-0.04em] ${
                          passed
                            ? "text-emerald-600"
                            : "text-[var(--text-primary)]"
                        }`}
                      >
                        {submission.score !== null
                          ? `${submission.score}%`
                          : "—"}
                      </p>

                      <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                        Passing{" "}
                        {submission.passingScore}%
                      </p>
                    </div>

                    <Link
                      href={`/learn/submissions/${submission.id}`}
                      className="ml-auto inline-flex items-center gap-2 whitespace-nowrap text-[12px] font-semibold text-[var(--text-primary)] transition hover:text-[var(--teal)]"
                    >
                      View details

                      <span aria-hidden="true">
                        →
                      </span>
                    </Link>
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}
    </>
  );
}