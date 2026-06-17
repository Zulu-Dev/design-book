"use client";

import type { ZoomLevel } from "@/lib/zoom";
import { setStoredZoom, zoomLabel, ZOOM_LEVELS } from "@/lib/zoom";

type ZoomDialProps = {
  zoom: ZoomLevel;
  onZoomChange: (zoom: ZoomLevel) => void;
};

export function ZoomDial({ zoom, onZoomChange }: ZoomDialProps) {
  function handleChange(level: ZoomLevel) {
    setStoredZoom(level);
    onZoomChange(level);
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-zinc-800 p-0.5 text-xs">
      {ZOOM_LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => handleChange(level)}
          className={`rounded-full px-2.5 py-1 font-medium transition ${
            zoom === level
              ? "bg-zinc-100 text-zinc-900"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
          aria-pressed={zoom === level}
        >
          {zoomLabel(level)}
        </button>
      ))}
    </div>
  );
}

export { getStoredZoom as readStoredZoom } from "@/lib/zoom";
