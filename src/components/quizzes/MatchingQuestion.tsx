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
    .sort((a, b) => a.display_order - b.display_order);

  const rightItems = items
    .filter((item) => item.item_side === "right")
    .sort((a, b) => a.display_order - b.display_order);

  function updateMatch(
    leftId: string,
    rightId: string
  ) {
    onChange({
      ...value,
      [leftId]: rightId,
    });
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

          <div className="hidden text-slate-300 md:block">
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
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-purple-400 disabled:bg-slate-50"
          >
            <option value="">
              Select a match...
            </option>

            {rightItems.map((right) => (
              <option
                key={right.item_id}
                value={right.item_id}
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