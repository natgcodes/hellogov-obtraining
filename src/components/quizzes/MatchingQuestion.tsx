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

    // If the learner clears the selection,
    // remove this match entirely.
    if (!rightId) {
      delete nextValue[leftId];
      onChange(nextValue);
      return;
    }

    // Matching is one-to-one.
    // Remove this right-side item from any
    // previous left-side assignment.
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
      {leftItems.map((left) => (
        <div
          key={left.item_id}
          className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_auto_1fr] md:items-center"
        >
          <div className="font-medium text-slate-900">
            {left.item_text}
          </div>

          <div
            className="hidden text-slate-300 md:block"
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
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-purple-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
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
      ))}
    </div>
  );
}