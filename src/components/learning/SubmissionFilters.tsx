"use client";

type SubmissionFilter =
  | "all"
  | "quiz"
  | "checkpoint";

type StatusFilter =
  | "all"
  | "passed"
  | "not_passed"
  | "pending";

type Props = {
  typeFilter: SubmissionFilter;
  statusFilter: StatusFilter;
  onTypeChange: (
    value: SubmissionFilter
  ) => void;
  onStatusChange: (
    value: StatusFilter
  ) => void;
};

export default function SubmissionFilters({
  typeFilter,
  statusFilter,
  onTypeChange,
  onStatusChange,
}: Props) {
  const typeOptions: {
    label: string;
    value: SubmissionFilter;
  }[] = [
    { label: "All", value: "all" },
    { label: "Quizzes", value: "quiz" },
    {
      label: "Checkpoints",
      value: "checkpoint",
    },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center rounded-[10px] border border-[var(--border)] bg-white p-1">
        {typeOptions.map((option) => {
          const active =
            typeFilter === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                onTypeChange(option.value)
              }
              className={`rounded-[7px] px-3 py-1.5 text-[12px] font-semibold transition ${
                active
                  ? "bg-[var(--teal-soft)] text-[var(--teal-deep)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <select
        value={statusFilter}
        onChange={(event) =>
          onStatusChange(
            event.target
              .value as StatusFilter
          )
        }
        className="h-9 rounded-[9px] border border-[var(--border)] bg-white px-3 text-[12px] font-medium text-[var(--text-secondary)] outline-none transition focus:border-[var(--teal)]"
      >
        <option value="all">
          All statuses
        </option>

        <option value="passed">
          Passed
        </option>

        <option value="not_passed">
          Not passed
        </option>

        <option value="pending">
          Pending review
        </option>
      </select>
    </div>
  );
}