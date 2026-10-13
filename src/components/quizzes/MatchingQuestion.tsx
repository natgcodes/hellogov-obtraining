import type { SafeMatchingItem } from "@/lib/quizzes/types";

type Props = {
  items: SafeMatchingItem[];
  value: Record<string, string>;
  disabled?: boolean;
  onChange: (value: Record<string, string>) => void;
};

export default function MatchingQuestion({
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

  function updateMatch(
    leftId: string,
    rightId: string
  ) {
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

  return (
    <div className="space-y-3">
      {leftItems.map((left, index) => {
        const selected =
          Boolean(value[left.item_id]);

        return (
          <div
            key={left.item_id}
            className={`grid gap-3 rounded-[14px] border p-4 transition md:grid-cols-[minmax(0,1fr)_32px_minmax(0,1fr)] md:items-center ${
              selected
                ? "border-[#08A9C1]/25 bg-[#F5FCFD]"
                : "border-[var(--border)] bg-white"
            }`}
          >
            <div className="min-w-0">
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

            <select
              disabled={disabled}
              value={value[left.item_id] ?? ""}
              onChange={(event) =>
                updateMatch(
                  left.item_id,
                  event.target.value
                )
              }
              aria-label={`Select a match for ${left.item_text}`}
              className="w-full rounded-[10px] border border-[var(--border)] bg-white px-3.5 py-2.5 text-[13px] text-[var(--text-primary)] outline-none transition focus:border-[#08A9C1] focus:ring-2 focus:ring-[#08A9C1]/10 disabled:cursor-not-allowed disabled:bg-[var(--surface-soft)] disabled:text-[var(--text-muted)]"
            >
              <option value="">
                Select a match...
              </option>

              {rightItems.map((right) => (
                <option
                  key={right.item_id}
                  value={right.item_id}
                  disabled={isRightItemUsed(
                    right.item_id,
                    left.item_id
                  )}
                >
                  {right.item_text}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}