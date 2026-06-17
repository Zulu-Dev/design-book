"use client";

import Link from "next/link";

type FloatingLibraryButtonProps = {
  count: number | null;
};

export function FloatingLibraryButton({ count }: FloatingLibraryButtonProps) {
  return (
    <Link
      href="/library"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/95 px-4 py-2.5 text-sm font-medium text-zinc-100 shadow-lg backdrop-blur transition hover:border-emerald-500/60 hover:bg-zinc-800"
    >
      <span className="text-emerald-400">♥</span>
      Library
      {count !== null && (
        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs tabular-nums text-emerald-300">
          {count}
        </span>
      )}
    </Link>
  );
}
