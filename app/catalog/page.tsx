"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import {
  LatestOnlyToggle,
  readStoredLatestOnly,
} from "@/components/latest-only-toggle";
import { createBrowserClient } from "@/lib/supabase";
import type { Mockup } from "@/lib/database.types";
import { getStoredVoter } from "@/lib/voter";

const PAGE_SIZE = 48;

export default function CatalogPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef(0);
  const [voter, setVoter] = useState<string | null>(null);
  const [latestOnly, setLatestOnly] = useState(false);
  const [mockups, setMockups] = useState<Mockup[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [keeperCount, setKeeperCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [keepingId, setKeepingId] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_queue_stats", {
      latest_only: latestOnly,
    });

    if (error) {
      console.error(error);
      return;
    }

    const stats = data?.[0];
    if (stats) {
      setRemaining(Number(stats.remaining));
      setKeeperCount(Number(stats.keepers));
    }
  }, [supabase, latestOnly]);

  const fetchPage = useCallback(
    async (offset: number, replace: boolean) => {
      const { data, error } = await supabase.rpc("get_undecided_mockups", {
        batch_limit: PAGE_SIZE,
        page_offset: offset,
        latest_only: latestOnly,
      });

      if (error) {
        console.error(error);
        return [];
      }

      const rows = data ?? [];
      setMockups((prev) => (replace ? rows : [...prev, ...rows]));
      offsetRef.current = replace ? rows.length : offsetRef.current + rows.length;
      setHasMore(rows.length === PAGE_SIZE);
      return rows;
    },
    [supabase, latestOnly],
  );

  const reloadCatalog = useCallback(async () => {
    setLoading(true);
    setHasMore(true);
    setMockups([]);
    offsetRef.current = 0;
    await fetchPage(0, true);
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
    setLatestOnly(readStoredLatestOnly());
  }, [router]);

  useEffect(() => {
    if (!voter) return;
    void reloadCatalog();
  }, [voter, latestOnly, reloadCatalog]);

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
          void loadStats();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, voter, loadStats]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || loading || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || loadingMore || !hasMore) return;

        setLoadingMore(true);
        const offset = offsetRef.current;
        void fetchPage(offset, false).finally(() => {
          setLoadingMore(false);
        });
      },
      { rootMargin: "600px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchPage, hasMore, loading, loadingMore]);

  async function keepMockup(mockup: Mockup) {
    if (!voter || keepingId) return;

    setKeepingId(mockup.id);
    setMockups((prev) => prev.filter((m) => m.id !== mockup.id));
    setRemaining((prev) => (prev === null ? prev : Math.max(0, prev - 1)));
    setKeeperCount((prev) => (prev === null ? prev : prev + 1));

    const { error } = await supabase.from("votes").insert({
      mockup_id: mockup.id,
      voter: voter as "Ryan" | "Jackson",
      liked: true,
    });

    if (error && error.code !== "23505") {
      console.error(error);
      setMockups((prev) => [mockup, ...prev]);
      void loadStats();
    } else {
      void loadStats();
    }

    setKeepingId(null);
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <AppHeader active="catalog" />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Catalog</h1>
            <p className="text-sm text-zinc-400">
              Reviewing as {voter} · {remaining ?? "…"} left ·{" "}
              {keeperCount ?? "…"} keepers
            </p>
          </div>
          <p className="text-xs text-zinc-500">Tap a design to keep it</p>
        </div>

        <LatestOnlyToggle
          latestOnly={latestOnly}
          onLatestOnlyChange={setLatestOnly}
        />

        {loading ? (
          <p className="text-zinc-500">Loading catalog…</p>
        ) : mockups.length === 0 ? (
          <p className="text-zinc-500">
            No undecided mockups left with this filter.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {mockups.map((mockup) => (
              <button
                key={mockup.id}
                type="button"
                disabled={keepingId === mockup.id}
                onClick={() => void keepMockup(mockup)}
                className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 text-left transition hover:border-emerald-500/60 hover:ring-1 hover:ring-emerald-500/30 disabled:opacity-50"
              >
                <div className="relative aspect-[3/4]">
                  <Image
                    src={mockup.url}
                    alt={mockup.filename}
                    fill
                    className="object-contain p-2"
                    sizes="(max-width: 768px) 50vw, 200px"
                    unoptimized
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950/90 to-transparent px-2 pb-2 pt-8 opacity-0 transition group-hover:opacity-100">
                    <p className="text-center text-xs font-medium text-emerald-400">
                      Keep
                    </p>
                  </div>
                </div>
                <div className="border-t border-zinc-800 px-2 py-2">
                  <p className="truncate text-[11px] text-zinc-300">
                    {mockup.filename}
                  </p>
                  {(mockup.lot_id || mockup.design_id) && (
                    <p className="truncate text-[10px] text-zinc-500">
                      {[mockup.lot_id, mockup.design_id].filter(Boolean).join(" · ")}
                      {mockup.version ? ` · V${mockup.version}` : ""}
                    </p>
                  )}
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
