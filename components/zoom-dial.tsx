"use client";

import { getStoredZoom, setStoredZoom, ZOOM_MAX, ZOOM_MIN } from "@/lib/zoom";

type ZoomDialProps = {
  zoom: number;
  onZoomChange: (zoom: number) => void;
};

export function ZoomDial({ zoom, onZoomChange }: ZoomDialProps) {
  function handleChange(value: number) {
    setStoredZoom(value);
    onZoomChange(value);
  }

  return (
    <label className="flex items-center gap-2 text-xs text-zinc-400">
      <span className="hidden sm:inline">Zoom</span>
      <input
        type="range"
        min={ZOOM_MIN}
        max={ZOOM_MAX}
        step={0.25}
        value={zoom}
        onChange={(e) => handleChange(Number.parseFloat(e.target.value))}
        className="h-1 w-20 cursor-pointer accent-emerald-500 sm:w-24"
        aria-label="Hover zoom level"
      />
      <span className="w-8 tabular-nums text-zinc-300">{zoom.toFixed(1)}×</span>
    </label>
  );
}

export function readStoredZoom(): number {
  return getStoredZoom();
}
