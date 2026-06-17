"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CatalogMockup } from "@/lib/database.types";
import type { ZoomLevel } from "@/lib/zoom";
import type { VoterName } from "@/lib/voter";

const HOVER_DELAY_MS = 400;
const LENS_SIZE = 220;

type CatalogCardProps = {
  mockup: CatalogMockup;
  voter: VoterName;
  zoom: ZoomLevel;
  onToggleLike: () => void;
};

export function CatalogCard({
  mockup,
  voter,
  zoom,
  onToggleLike,
}: CatalogCardProps) {
  const imageAreaRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lensActive, setLensActive] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lens, setLens] = useState({
    clientX: 0,
    clientY: 0,
    bgX: 0,
    bgY: 0,
    imgW: 0,
    imgH: 0,
  });

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

  function updateLens(clientX: number, clientY: number) {
    const area = imageAreaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const imgW = rect.width * zoom;
    const imgH = rect.height * zoom;

    setLens({
      clientX,
      clientY,
      bgX: -(x * zoom - LENS_SIZE / 2),
      bgY: -(y * zoom - LENS_SIZE / 2),
      imgW,
      imgH,
    });
  }

  function handleMouseEnter(e: React.MouseEvent) {
    clearHoverTimer();
    hoverTimer.current = setTimeout(() => {
      setLensActive(true);
      updateLens(e.clientX, e.clientY);
    }, HOVER_DELAY_MS);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (lensActive) updateLens(e.clientX, e.clientY);
  }

  function handleMouseLeave() {
    clearHoverTimer();
    setLensActive(false);
  }

  const lensLeft =
    typeof window !== "undefined"
      ? Math.min(
          window.innerWidth - LENS_SIZE - 12,
          Math.max(12, lens.clientX + 16),
        )
      : 12;
  const lensTop =
    typeof window !== "undefined"
      ? Math.min(
          window.innerHeight - LENS_SIZE - 12,
          Math.max(12, lens.clientY + 16),
        )
      : 12;

  return (
    <>
      <button
        id={`m-${mockup.id}`}
        data-catalog-position={mockup.position}
        type="button"
        onClick={onToggleLike}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        aria-pressed={likedByMe}
        className={`group relative overflow-hidden rounded-lg border bg-zinc-900 text-left transition ${
          likedByMe
            ? "border-emerald-500 ring-2 ring-emerald-500/50"
            : "border-zinc-800 hover:border-emerald-500/60"
        }`}
      >
        <div ref={imageAreaRef} className="relative aspect-[4/3]">
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
        lensActive &&
        createPortal(
          <div
            className="pointer-events-none fixed z-50 overflow-hidden rounded-xl border border-zinc-600 bg-zinc-950 shadow-2xl ring-1 ring-white/10"
            style={{
              left: lensLeft,
              top: lensTop,
              width: LENS_SIZE,
              height: LENS_SIZE,
            }}
            aria-hidden
          >
            <div
              style={{
                width: lens.imgW,
                height: lens.imgH,
                backgroundImage: `url(${mockup.url})`,
                backgroundSize: `${lens.imgW}px ${lens.imgH}px`,
                backgroundPosition: `${lens.bgX}px ${lens.bgY}px`,
                backgroundRepeat: "no-repeat",
              }}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
