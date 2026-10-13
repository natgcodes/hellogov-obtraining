import type { SafeMatchingItem } from "@/lib/quizzes/types";

type Props = {
  items: SafeMatchingItem[];
  value: Record<string, string>;
  disabled?: boolean;
  onChange: (value: Record<string, string>) => void;
};

export default function MatchCardsQuestion({
  items,
  value,
  disabled = false,
  onChange,
}: Props) {
  const leftItems = items
    .filter((item) => item.item_side === "left")
    .sort(
      (a, b) =>
        a.display_order - b.display_order
    );

  const rightItems = items
    .filter((item) => item.item_side === "right")
    .sort(
      (a, b) =>
        a.display_order - b.display_order
    );

  function choose(
    leftId: string,
    rightId: string
  ) {
    if (disabled) return;

    const nextValue = { ...value };

    if (!rightId) {
      delete nextValue[leftId];
      onChange(nextValue);
      return;
    }

    for (const [
      existingLeftId,
      existingRightId,
    ] of Object.entries(nextValue)) {
      if (
        existingLeftId !== leftId &&
        existingRightId === rightId
      ) {
        delete nextValue[existingLeftId];
      }
    }

    nextValue[leftId] = rightId;

    onChange(nextValue);
  }

  function clearMatch(leftId: string) {
    if (disabled) return;

    const nextValue = { ...value };

    delete nextValue[leftId];

    onChange(nextValue);
  }

  function isRightItemUsed(
    rightId: string,
    currentLeftId: string
  ) {
    return Object.entries(value).some(
      ([leftId, selectedRightId]) =>
        leftId !== currentLeftId &&
        selectedRightId === rightId
    );
  }

  const completedCount = leftItems.filter(
    (left) => Boolean(value[left.item_id])
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-[var(--text-primary)]">
            Match each item with its correct answer
          </p>

          <p className="mt-1 text-[12px] text-[var(--text-muted)]">
            Each answer can only be used once.
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
            completedCount === leftItems.length &&
            leftItems.length > 0
              ? "bg-[var(--success-soft)] text-[var(--success)]"
              : "bg-[var(--surface-muted)] text-[var(--text-secondary)]"
          }`}
        >
          {completedCount} / {leftItems.length}{" "}
          matched
        </span>
      </div>

      <div className="space-y-3">
        {leftItems.map((left, index) => {
          const selectedRightId =
            value[left.item_id] ?? "";

          const selectedRight =
            rightItems.find(
              (right) =>
                right.item_id ===
                selectedRightId
            );

          return (
            <div
              key={left.item_id}
              className={`rounded-[14px] border p-4 transition ${
                selectedRight
                  ? "border-[#08A9C1]/25 bg-[#F5FCFD]"
                  : "border-[var(--border)] bg-white"
              }`}
            >
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_32px_minmax(0,1fr)_auto] md:items-center">
                <div className="rounded-[10px] border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Item {index + 1}
                  </p>

                  <p className="mt-1 whitespace-pre-wrap text-[13px] font-semibold leading-5 text-[var(--text-primary)]">
                    {left.item_text}
                  </p>
                </div>

                <div
                  className="hidden text-center text-[var(--text-muted)] md:block"
                  aria-hidden="true"
                >
                  →
                </div>

                <div>
                  <select
                    value={selectedRightId}
                    disabled={disabled}
                    aria-label={`Select a match for ${left.item_text}`}
                    onChange={(event) =>
                      choose(
                        left.item_id,
                        event.target.value
                      )
                    }
                    className={`w-full rounded-[10px] border bg-white px-3.5 py-3 text-[13px] outline-none transition focus:border-[#08A9C1] focus:ring-2 focus:ring-[#08A9C1]/10 disabled:cursor-not-allowed disabled:bg-[var(--surface-soft)] disabled:text-[var(--text-muted)] ${
                      selectedRight
                        ? "border-[#08A9C1]/40 font-medium text-[var(--text-primary)]"
                        : "border-[var(--border)] text-[var(--text-secondary)]"
                    }`}
                  >
                    <option value="">
                      Select a match...
                    </option>

                    {rightItems.map(
                      (right) => {
                        const usedByAnotherItem =
                          isRightItemUsed(
                            right.item_id,
                            left.item_id
                          );

                        return (
                          <option
                            key={right.item_id}
                            value={right.item_id}
                            disabled={
                              usedByAnotherItem
                            }
                          >
                            {right.item_text}
                            {usedByAnotherItem
                              ? " — already matched"
                              : ""}
                          </option>
                        );
                      }
                    )}
                  </select>

                  {selectedRight && (
                    <p className="mt-2 text-[11px] font-medium text-[#07879B] md:hidden">
                      {left.item_text} →{" "}
                      {selectedRight.item_text}
                    </p>
                  )}
                </div>

                <div>
                  {selectedRight &&
                  !disabled ? (
                    <button
                      type="button"
                      onClick={() =>
                        clearMatch(
                          left.item_id
                        )
                      }
                      aria-label={`Clear match for ${left.item_text}`}
                      className="rounded-[9px] px-3 py-2 text-[11px] font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                    >
                      Clear
                    </button>
                  ) : (
                    <div
                      className="w-[50px]"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </div>

              {selectedRight && (
                <div className="mt-3 hidden rounded-[10px] border border-[#08A9C1]/15 bg-[#EAF8FA] px-4 py-2.5 text-[12px] text-[#086F80] md:block">
                  <span className="font-semibold">
                    {left.item_text}
                  </span>

                  <span
                    className="mx-2 text-[#08A9C1]"
                    aria-hidden="true"
                  >
                    →
                  </span>

                  <span>
                    {selectedRight.item_text}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {completedCount === leftItems.length &&
        leftItems.length > 0 && (
          <div className="rounded-[12px] border border-[var(--success)]/20 bg-[var(--success-soft)] px-4 py-3 text-[12px] font-medium text-[var(--success)]">
            ✓ All items have been matched.
          </div>
        )}
    </div>
  );
}