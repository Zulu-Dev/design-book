"use client";

import {
  getStoredLatestOnly,
  getStoredLotFilter,
  setStoredLatestOnly,
  setStoredLotFilter,
} from "@/lib/filters";

export type LotOption = {
  lot_id: string;
  mockup_count: number;
  undecided_count: number;
};

type SwipeFiltersProps = {
  lots: LotOption[];
  lotFilter: string | null;
  latestOnly: boolean;
  onLotFilterChange: (lotId: string | null) => void;
  onLatestOnlyChange: (latestOnly: boolean) => void;
};

export function SwipeFilters({
  lots,
  lotFilter,
  latestOnly,
  onLotFilterChange,
  onLatestOnlyChange,
}: SwipeFiltersProps) {
  function handleLotChange(value: string) {
    const next = value || null;
    setStoredLotFilter(next);
    onLotFilterChange(next);
  }

  function handleLatestOnlyChange(checked: boolean) {
    setStoredLatestOnly(checked);
    onLatestOnlyChange(checked);
  }

  return (
    <div className="mb-4 space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div>
        <label
          htmlFor="lot-filter"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500"
        >
          Project
        </label>
        <select
          id="lot-filter"
          value={lotFilter ?? ""}
          onChange={(e) => handleLotChange(e.target.value)}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
        >
          <option value="">All projects</option>
          {lots.map((lot) => (
            <option key={lot.lot_id} value={lot.lot_id}>
              {lot.lot_id} ({lot.undecided_count} left / {lot.mockup_count} total)
            </option>
          ))}
        </select>
      </div>

      <label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={latestOnly}
          onChange={(e) => handleLatestOnlyChange(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-600 bg-zinc-950"
        />
        Latest version only
        <span className="text-xs text-zinc-500">
          Skip older V1–V11 when a newer version exists
        </span>
      </label>
    </div>
  );
}

export function readStoredFilters() {
  return {
    lotFilter: getStoredLotFilter(),
    latestOnly: getStoredLatestOnly(),
  };
}
