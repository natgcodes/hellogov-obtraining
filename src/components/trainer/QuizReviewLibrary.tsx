"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type QuizLibraryItem = {
  id: string;
  title: string;
  dayNumber: number;
  dayTitle: string;
  sectionTitle: string;
  type: "Quiz" | "Checkpoint";
  published: boolean;
  createdAt: string | null;
};

type Props = {
  items: QuizLibraryItem[];
};

type DateFilter =
  | "all"
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "custom";

// ============================================================
// DATE HELPERS
// ============================================================

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
  createdAt: string | null,
  dateFilter: DateFilter,
  startDate: string,
  endDate: string
) {
  if (dateFilter === "all") return true;

  if (!createdAt) return false;

  const date = new Date(createdAt);

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

// ============================================================
// MAIN LIBRARY
// ============================================================

export default function QuizReviewLibrary({ items }: Props) {
  // SEARCH

  const [search, setSearch] = useState("");

  // TRAINING DAY FILTER

  const [dayFilter, setDayFilter] = useState("all");

  // DATE FILTER

  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // ============================================================
  // AVAILABLE TRAINING DAYS
  // ============================================================

  const availableDays = useMemo(() => {
    return [...new Set(items.map((item) => item.dayNumber))].sort(
      (a, b) => a - b
    );
  }, [items]);

  // ============================================================
  // FILTER LIBRARY ITEMS
  // ============================================================

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      // SEARCH FILTER

      const matchesSearch =
        !query ||
        [
          item.title,
          item.dayTitle,
          item.sectionTitle,
          item.type,
          `Day ${item.dayNumber}`,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      // TRAINING DAY FILTER

      const matchesDay =
        dayFilter === "all" ||
        item.dayNumber === Number(dayFilter);

      // DATE FILTER

      const matchesDate = matchesDateFilter(
        item.createdAt,
        dateFilter,
        startDate,
        endDate
      );

      return matchesSearch && matchesDay && matchesDate;
    });
  }, [
    items,
    search,
    dayFilter,
    dateFilter,
    startDate,
    endDate,
  ]);

  // ============================================================
  // ACTIVE FILTERS
  // ============================================================

  const hasFilters =
    search.trim() !== "" ||
    dayFilter !== "all" ||
    dateFilter !== "all";

  // ============================================================
  // CLEAR FILTERS
  // ============================================================

  function clearFilters() {
    setSearch("");
    setDayFilter("all");
    setDateFilter("all");
    setStartDate("");
    setEndDate("");
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div>
      {/* ======================================================
          SEARCH AND FILTERS
      ====================================================== */}

      <div className="mt-7 rounded-[18px] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-xs)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:flex-nowrap">

          {/* SEARCH */}

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search quizzes, checkpoints, days, or sections..."
            aria-label="Search quiz library"
            className="min-w-0 flex-1 rounded-[10px] border border-[var(--border)] bg-[#FAFBFC] px-4 py-3 text-[13px] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[#08A9C1] focus:bg-white focus:ring-2 focus:ring-[#08A9C1]/10"
          />

          {/* TRAINING DAY FILTER */}

          <select
            value={dayFilter}
            onChange={(event) => setDayFilter(event.target.value)}
            aria-label="Filter by training day"
            className="rounded-[10px] border border-[var(--border)] bg-white px-4 py-3 text-[13px] text-[var(--text-secondary)] outline-none transition focus:border-[#08A9C1]"
          >
            <option value="all">All days</option>

            {availableDays.map((day) => (
              <option key={day} value={String(day)}>
                Day {day}
              </option>
            ))}
          </select>

          {/* DATE FILTER */}

          <select
            value={dateFilter}
            onChange={(event) =>
              setDateFilter(event.target.value as DateFilter)
            }
            aria-label="Filter quizzes by creation date"
            className="rounded-[10px] border border-[var(--border)] bg-white px-4 py-3 text-[13px] text-[var(--text-secondary)] outline-none transition focus:border-[#08A9C1]"
          >
            <option value="all">All dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last7">Last 7 days</option>
            <option value="last30">Last 30 days</option>
            <option value="custom">Custom range</option>
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

            {/* START DATE */}

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="quiz-review-start-date"
                className="text-[11px] font-medium text-[var(--text-secondary)]"
              >
                From
              </label>

              <input
                id="quiz-review-start-date"
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) =>
                  setStartDate(event.target.value)
                }
                className="rounded-[10px] border border-[var(--border)] bg-white px-4 py-2.5 text-[13px] text-[var(--text-primary)] outline-none focus:border-[#08A9C1]"
              />
            </div>

            {/* END DATE */}

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="quiz-review-end-date"
                className="text-[11px] font-medium text-[var(--text-secondary)]"
              >
                To
              </label>

              <input
                id="quiz-review-end-date"
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
              Filter assessments by creation date.
            </p>
          </div>
        )}
      </div>

      {/* ======================================================
          QUIZ LIBRARY
      ====================================================== */}

      <div className="mt-6 overflow-hidden rounded-[14px] border border-[var(--border)] bg-white">

        {/* LIBRARY HEADER */}

        <div className="border-b border-[var(--border-soft)] px-5 py-4">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
            Quiz Library
          </h2>

          <p className="mt-1 text-[12px] text-[var(--text-muted)]">
            {filteredItems.length} of {items.length} assessments available
          </p>
        </div>

        {/* EMPTY STATE */}

        {filteredItems.length === 0 ? (
          <p className="p-6 text-sm text-[var(--text-secondary)]">
            {hasFilters
              ? "No quizzes or checkpoints match your filters."
              : "No quizzes or checkpoints found."}
          </p>
        ) : (

          /* ASSESSMENT LIST */

          <div className="divide-y divide-[var(--border-soft)]">
            {filteredItems.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >

                {/* ASSESSMENT INFORMATION */}

                <div>
                  <div className="flex flex-wrap items-center gap-2">

                    {/* TITLE */}

                    <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                      {item.title}
                    </span>

                    {/* TYPE */}

                    <span className="rounded-full bg-[var(--surface-soft)] px-2 py-1 text-[10px] font-medium">
                      {item.type}
                    </span>

                    {/* PUBLICATION STATUS */}

                    {!item.published && (
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700">
                        Unpublished
                      </span>
                    )}
                  </div>

                  {/* TRAINING DAY AND SECTION */}

                  <p className="mt-1.5 text-[12px] text-[var(--text-secondary)]">
                    Day {item.dayNumber} · {item.dayTitle} ·{" "}
                    {item.sectionTitle}
                  </p>
                </div>

                {/* VIEW QUESTIONS */}

                <Link
                  href={`/trainer/quiz-review/${item.id}`}
                  className="inline-flex shrink-0 items-center justify-center rounded-[9px] bg-[var(--teal)] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:opacity-90"
                >
                  View Questions →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}