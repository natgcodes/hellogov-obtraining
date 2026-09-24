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
    .sort((a, b) => a.display_order - b.display_order);

  const rightItems = items
    .filter((item) => item.item_side === "right")
    .sort((a, b) => a.display_order - b.display_order);

  function choose(leftId: string, rightId: string) {
    if (disabled) return;

    const nextValue = { ...value };

    // Remove this right-side answer from any previous pair.
    // This guarantees one-to-one matching.
    Object.entries(nextValue).forEach(
      ([existingLeftId, existingRightId]) => {
        if (
          existingRightId === rightId &&
          existingLeftId !== leftId
        ) {
          delete nextValue[existingLeftId];
        }
      }
    );

    if (!rightId) {
      delete nextValue[leftId];
    } else {
      nextValue[leftId] = rightId;
    }

    onChange(nextValue);
  }

  function clearMatch(leftId: string) {
    if (disabled) return;

    const nextValue = { ...value };
    delete nextValue[leftId];

    onChange(nextValue);
  }

  const completedCount = leftItems.filter(
    (left) => Boolean(value[left.item_id])
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Match each item with its correct answer
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Each answer can only be used once.
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {completedCount} / {leftItems.length} matched
        </span>
      </div>

      <div className="space-y-3">
        {leftItems.map((left, index) => {
          const selectedRightId =
            value[left.item_id] ?? "";

          const selectedRight = rightItems.find(
            (right) =>
              right.item_id === selectedRightId
          );

          return (
            <div
              key={left.item_id}
              className={`rounded-2xl border p-4 transition ${
                selectedRight
                  ? "border-purple-200 bg-purple-50/40"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)_auto] md:items-center">
                {/* LEFT ITEM */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Item {index + 1}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {left.item_text}
                  </p>
                </div>

                {/* ARROW */}
                <div className="hidden text-center text-lg text-slate-300 md:block">
                  →
                </div>

                {/* RIGHT SELECTION */}
                <div>
                  <select
                    value={selectedRightId}
                    disabled={disabled}
                    onChange={(event) =>
                      choose(
                        left.item_id,
                        event.target.value
                      )
                    }
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                      selectedRight
                        ? "border-purple-300 bg-white font-medium text-purple-900"
                        : "border-slate-200 bg-white text-slate-600"
                    } focus:border-purple-400 disabled:cursor-default disabled:bg-slate-50`}
                  >
                    <option value="">
                      Select a match...
                    </option>

                    {rightItems.map((right) => {
                      const usedByAnotherItem =
                        Object.entries(value).some(
                          ([
                            existingLeftId,
                            existingRightId,
                          ]) =>
                            existingLeftId !==
                              left.item_id &&
                            existingRightId ===
                              right.item_id
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
                    })}
                  </select>

                  {selectedRight && (
                    <p className="mt-2 text-xs font-medium text-purple-700 md:hidden">
                      {left.item_text} →{" "}
                      {selectedRight.item_text}
                    </p>
                  )}
                </div>

                {/* CLEAR */}
                <div>
                  {selectedRight && !disabled ? (
                    <button
                      type="button"
                      onClick={() =>
                        clearMatch(left.item_id)
                      }
                      className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                    >
                      Clear
                    </button>
                  ) : (
                    <div className="w-[50px]" />
                  )}
                </div>
              </div>

              {/* EXPLICIT CONFIRMATION */}
              {selectedRight && (
                <div className="mt-3 hidden rounded-xl bg-purple-50 px-4 py-2.5 text-sm text-purple-800 md:block">
                  <span className="font-semibold">
                    {left.item_text}
                  </span>

                  <span className="mx-2 text-purple-400">
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
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            All items have been matched.
          </div>
        )}
    </div>
  );
}