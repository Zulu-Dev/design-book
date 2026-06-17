type ScrollProgressProps = {
  percent: number;
};

export function ScrollProgress({ percent }: ScrollProgressProps) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 w-28 overflow-hidden rounded-full bg-zinc-800 sm:w-36"
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Catalog scroll progress"
      >
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] duration-150"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-zinc-400">
        {Math.round(clamped)}%
      </span>
    </div>
  );
}
