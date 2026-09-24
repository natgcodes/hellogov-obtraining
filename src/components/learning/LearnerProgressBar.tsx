type Props = {
  value: number;
};

export default function LearnerProgressBar({ value }: Props) {
  const safeValue = Math.min(100, Math.max(0, value));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">
          Overall progress
        </span>

        <span className="font-semibold text-slate-900">
          {Math.round(safeValue)}%
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-[#e84545] transition-all duration-300"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}