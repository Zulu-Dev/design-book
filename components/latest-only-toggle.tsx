"use client";

import { getStoredLatestOnly, setStoredLatestOnly } from "@/lib/filters";

type LatestOnlyToggleProps = {
  latestOnly: boolean;
  onLatestOnlyChange: (latestOnly: boolean) => void;
};

export function LatestOnlyToggle({
  latestOnly,
  onLatestOnlyChange,
}: LatestOnlyToggleProps) {
  function handleChange(checked: boolean) {
    setStoredLatestOnly(checked);
    onLatestOnlyChange(checked);
  }

  return (
    <label className="mb-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-300">
      <input
        type="checkbox"
        checked={latestOnly}
        onChange={(e) => handleChange(e.target.checked)}
        className="h-4 w-4 rounded border-zinc-600 bg-zinc-950"
      />
      <span>
        Latest version only
        <span className="mt-0.5 block text-xs text-zinc-500">
          Only show the highest V number for each product
        </span>
      </span>
    </label>
  );
}

export function readStoredLatestOnly(): boolean {
  return getStoredLatestOnly();
}
