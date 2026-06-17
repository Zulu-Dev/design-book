"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { createBrowserClient } from "@/lib/supabase";
import type { Mockup } from "@/lib/database.types";
import { getStoredVoter } from "@/lib/voter";

const PAGE_SIZE = 48;

// One implied-archive action: everything scrolled past gets archived, one kept.
type UndoAction = {
  mockups: Mockup[];
  keptId: string;
};

export default function CatalogPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef(-1);
  const statsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [voter, setVoter] = useState<string | null>(null);
  const [mockups, setMockups] = useState<Mockup[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [keeperCount, setKeeperCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [busy, setBusy] = useState(false);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);

  const loadStats = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_queue_stats");
    if (error) {
      console.error(error);
      return;
    }
    const stats = data?.[0];
    if (stats) {
      setRemaining(Number(stats.remaining));
      setKeeperCount(Number(stats.keepers));
    }
  }, [supabase]);

  const scheduleStats = useCallback(() => {
    if (statsTimer.current) clearTimeout(statsTimer.current);
    statsTimer.current = setTimeout(() => void loadStats(), 350);
  }, [loadStats]);

  const fetchPage = useCallback(
    async (afterPosition: number, replace: boolean) => {
      const { data, error } = await supabase.rpc("get_undecided_mockups", {
        batch_limit: PAGE_SIZE,
        after_position: afterPosition,
      });

      if (error) {
        console.error(error);
        return [];
      }

      const rows = data ?? [];
      if (rows.length > 0) {
        cursorRef.current = rows[rows.length - 1].position;
      }
      setMockups((prev) => (replace ? rows : [...prev, ...rows]));
      setHasMore(rows.length === PAGE_SIZE);
      return rows;
    },
    [supabase],
  );

  const reloadCatalog = useCallback(async () => {
    setLoading(true);
    setHasMore(true);
    setUndoStack([]);
    setMockups([]);
    cursorRef.current = -1;
    await fetchPage(-1, true);
    await loadStats();
    setLoading(false);
  }, [fetchPage, loadStats]);

  useEffect(() => {
    const stored = getStoredVoter();
    if (!stored) {
      router.replace("/");
      return;
    }
    setVoter(stored);
  }, [router]);

  useEffect(() => {
    if (!voter) return;
    void reloadCatalog();
  }, [voter, reloadCatalog]);

  useEffect(() => {
    if (!voter) return;

    const channel = supabase
      .channel("catalog-votes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "votes" },
        (payload) => {
          const mockupId = payload.new.mockup_id as string;
          setMockups((prev) => prev.filter((m) => m.id !== mockupId));
          scheduleStats();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, voter, scheduleStats]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || loading || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || loadingMore || !hasMore) return;
        setLoadingMore(true);
        void fetchPage(cursorRef.current, false).finally(() => {
          setLoadingMore(false);
        });
      },
      { rootMargin: "800px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchPage, hasMore, loading, loadingMore]);

  // Keep the clicked mockup; everything scrolled past (before it) is archived.
  async function keepMockup(target: Mockup) {
    if (!voter || busy) return;

    const index = mockups.findIndex((m) => m.id === target.id);
    if (index === -1) return;

    setBusy(true);

    const archived = mockups.slice(0, index);
    const decided = [...archived, target];
    const decidedIds = new Set(decided.map((m) => m.id));

    setMockups((prev) => prev.filter((m) => !decidedIds.has(m.id)));
    setRemaining((prev) =>
      prev === null ? prev : Math.max(0, prev - decided.length),
    );
    setKeeperCount((prev) => (prev === null ? prev : prev + 1));
    setUndoStack((prev) => [...prev, { mockups: decided, keptId: target.id }]);

    const rows = decided.map((m) => ({
      mockup_id: m.id,
      voter: voter as "Ryan" | "Jackson",
      liked: m.id === target.id,
    }));

    const { error } = await supabase
      .from("votes")
      .upsert(rows, { onConflict: "mockup_id", ignoreDuplicates: true });

    if (error) {
      console.error(error);
    }
    scheduleStats();
    setBusy(false);
  }

  async function undoLast() {
    if (busy || undoStack.length === 0) return;
    setBusy(true);

    const action = undoStack[undoStack.length - 1];
    const ids = action.mockups.map((m) => m.id);

    setUndoStack((prev) => prev.slice(0, -1));
    setMockups((prev) => {
      const present = new Set(prev.map((m) => m.id));
      const restored = action.mockups.filter((m) => !present.has(m.id));
      return [...restored, ...prev].sort((a, b) => a.position - b.position);
    });
    setRemaining((prev) =>
      prev === null ? prev : prev + action.mockups.length,
    );
    setKeeperCount((prev) => (prev === null ? prev : Math.max(0, prev - 1)));

    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("voter", voter as "Ryan" | "Jackson")
      .in("mockup_id", ids);

    if (error) {
      console.error(error);
    }
    scheduleStats();
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <AppHeader active="catalog" />

      <div className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold leading-tight">Catalog</h1>
            <p className="text-xs text-zinc-400">
              {voter} · {remaining ?? "…"} left · {keeperCount ?? "…"} keepers
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-zinc-500 sm:inline">
              Tap a design to keep it — everything above gets archived
            </span>
            <button
              type="button"
              onClick={() => void undoLast()}
              disabled={busy || undoStack.length === 0}
              className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white disabled:opacity-40"
            >
              Undo{undoStack.length > 0 ? ` (${undoStack.length})` : ""}
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5">
        {loading ? (
          <p className="text-zinc-500">Loading catalog…</p>
        ) : mockups.length === 0 ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-zinc-400">
              No undecided mockups left — everything has been reviewed.
            </p>
            <a
              href="/library"
              className="rounded-full bg-zinc-100 px-5 py-2 text-sm font-medium text-zinc-900"
            >
              View keepers
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {mockups.map((mockup) => (
              <button
                key={mockup.id}
                type="button"
                disabled={busy}
                onClick={() => void keepMockup(mockup)}
                className="group relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 text-left transition hover:border-emerald-500/70 hover:ring-2 hover:ring-emerald-500/30 disabled:opacity-60"
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
                  <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/0 opacity-0 transition group-hover:bg-emerald-500/10 group-hover:opacity-100">
                    <span className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-zinc-950 shadow-lg">
                      Keep
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-zinc-800 px-2 py-1">
                  <span className="truncate text-[10px] text-zinc-400">
                    {[mockup.lot_id, mockup.design_id]
                      .filter(Boolean)
                      .join(" · ") || mockup.filename}
                  </span>
                  {mockup.version ? (
                    <span className="shrink-0 text-[10px] font-medium text-zinc-500">
                      V{mockup.version}
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}

        <div ref={loadMoreRef} className="py-8 text-center text-sm text-zinc-500">
          {loadingMore
            ? "Loading more…"
            : hasMore
              ? "Scroll for more"
              : mockups.length > 0
                ? "End of catalog"
                : null}
        </div>
      </main>
    </div>
  );
}
