"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CatalogMockup } from "@/lib/database.types";
import type { VoterName } from "@/lib/voter";

const HOVER_DELAY_MS = 1000;

type CatalogCardProps = {
  mockup: CatalogMockup;
  voter: VoterName;
  zoom: number;
  onToggleLike: () => void;
};

export function CatalogCard({
  mockup,
  voter,
  zoom,
  onToggleLike,
}: CatalogCardProps) {
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [magnify, setMagnify] = useState(false);
  const [mounted, setMounted] = useState(false);

  const likedByMe =
    voter === "Ryan" ? mockup.liked_by_ryan : mockup.liked_by_jackson;
  const likedByThem =
    voter === "Ryan" ? mockup.liked_by_jackson : mockup.liked_by_ryan;

  useEffect(() => {
    setMounted(true);
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, []);

  function clearHoverTimer() {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }

  function handleMouseEnter() {
    clearHoverTimer();
    hoverTimer.current = setTimeout(() => setMagnify(true), HOVER_DELAY_MS);
  }

  function handleMouseLeave() {
    clearHoverTimer();
    setMagnify(false);
  }

  return (
    <>
      <button
        id={`m-${mockup.id}`}
        data-catalog-position={mockup.position}
        type="button"
        onClick={onToggleLike}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-pressed={likedByMe}
        className={`group relative overflow-hidden rounded-lg border bg-zinc-900 text-left transition ${
          likedByMe
            ? "border-emerald-500 ring-2 ring-emerald-500/50"
            : "border-zinc-800 hover:border-emerald-500/60"
        }`}
      >
        <div className="relative aspect-[4/3]">
          <Image
            src={mockup.url}
            alt={mockup.filename}
            fill
            className="object-contain"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            unoptimized
          />

          {likedByThem && (
            <span className="absolute left-2 top-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold text-zinc-950">
              ♥ {voter === "Ryan" ? "Jackson" : "Ryan"}
            </span>
          )}

          {likedByMe ? (
            <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-zinc-950 shadow">
              ✓
            </span>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
              <span className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-zinc-950 shadow-lg">
                Keep
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-zinc-800 px-2 py-1">
          <span className="truncate text-[10px] text-zinc-400">
            {[mockup.lot_id, mockup.design_id].filter(Boolean).join(" · ") ||
              mockup.filename}
          </span>
          {mockup.version ? (
            <span className="shrink-0 text-[10px] font-medium text-zinc-500">
              V{mockup.version}
            </span>
          ) : null}
        </div>
      </button>

      {mounted &&
        magnify &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
            aria-hidden
          >
            <div
              className="relative max-h-[85vh] max-w-[90vw]"
              style={{
                width: `${Math.min(90, 45 * zoom)}vw`,
                height: `${Math.min(85, 40 * zoom)}vh`,
              }}
            >
              <Image
                src={mockup.url}
                alt=""
                fill
                className="object-contain"
                sizes="90vw"
                unoptimized
                priority
              />
            </div>
            <p className="absolute bottom-6 text-xs text-zinc-400">
              {[mockup.lot_id, mockup.design_id].filter(Boolean).join(" · ")}
              {mockup.version ? ` · V${mockup.version}` : ""} · {zoom.toFixed(1)}×
            </p>
          </div>,
          document.body,
        )}
    </>
  );
}
