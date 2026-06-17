"use client";

import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { SwipeCard } from "@/components/swipe-card";
import {
  readStoredFilters,
  SwipeFilters,
  type LotOption,
} from "@/components/swipe-filters";
import { createBrowserClient } from "@/lib/supabase";
import type { Mockup } from "@/lib/database.types";
import { getStoredVoter } from "@/lib/voter";

const BATCH_SIZE = 30;

export default function SwipePage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);
  const [voter, setVoter] = useState<string | null>(null);
  const [deck, setDeck] = useState<Mockup[]>([]);
  const [lots, setLots] = useState<LotOption[]>([]);
  const [lotFilter, setLotFilter] = useState<string | null>(null);
  const [latestOnly, setLatestOnly] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [keeperCount, setKeeperCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);

  const loadStats = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_queue_stats", {
      lot_filter: lotFilter,
      latest_only: latestOnly,
    });

    if (error) {
      console.error(error);
      return;
    }

    const stats = data?.[0];
    setRemaining(Number(stats?.remaining ?? 0));
    setKeeperCount(Number(stats?.keepers ?? 0));
  }, [supabase, lotFilter, latestOnly]);

  const fetchBatch = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_undecided_mockups", {
      batch_limit: BATCH_SIZE,
      lot_filter: lotFilter,
      latest_only: latestOnly,
    });

    if (error) {
      console.error(error);
      return [];
    }

    return data ?? [];
  }, [supabase, lotFilter, latestOnly]);

  const reloadDeck = useCallback(async () => {
    setLoading(true);
    const batch = await fetchBatch();
    setDeck(batch);
    await loadStats();
    setLoading(false);
  }, [fetchBatch, loadStats]);

  useEffect(() => {
    const stored = getStoredVoter();
    if (!stored) {
      router.replace("/");
      return;
    }

    const filters = readStoredFilters();
    setVoter(stored);
    setLotFilter(filters.lotFilter);
    setLatestOnly(filters.latestOnly);
  }, [router]);

  useEffect(() => {
    if (!voter) return;

    async function init() {
      const { data: lotRows } = await supabase.rpc("list_lot_ids");
      setLots(lotRows ?? []);
      await reloadDeck();
    }

    void init();
  }, [voter, lotFilter, latestOnly, supabase, reloadDeck]);

  useEffect(() => {
    if (!voter) return;

    const channel = supabase
      .channel("votes-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "votes" },
        (payload) => {
          const mockupId = payload.new.mockup_id as string;
          setDeck((current) => current.filter((m) => m.id !== mockupId));
          void loadStats();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, voter, loadStats]);

  const handleSwipe = useCallback(
    async (liked: boolean) => {
      const current = deck[0];
      if (!current || !voter) return;

      setDeck((prev) => prev.slice(1));

      const { error } = await supabase.from("votes").insert({
        mockup_id: current.id,
        voter: voter as "Ryan" | "Jackson",
        liked,
      });

      if (error && error.code !== "23505") {
        console.error(error);
        setDeck((prev) => [current, ...prev]);
        return;
      }

      await loadStats();

      setDeck((prev) => {
        if (prev.length <= 4 && !fetchingMore) {
          setFetchingMore(true);
          void fetchBatch().then((more) => {
            setDeck((currentDeck) => {
              const existing = new Set(currentDeck.map((m) => m.id));
              const fresh = more.filter((m) => !existing.has(m.id));
              return [...currentDeck, ...fresh];
            });
            setFetchingMore(false);
          });
        }
        return prev;
      });
    },
    [deck, voter, supabase, loadStats, fetchBatch, fetchingMore],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") void handleSwipe(true);
      if (event.key === "ArrowLeft") void handleSwipe(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSwipe]);

  const visible = deck.slice(0, 2);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <AppHeader active="swipe" />

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6">
        <div className="mb-4 flex items-end justify-between text-sm">
          <div>
            <p className="text-zinc-400">Reviewing as {voter}</p>
            <p className="text-lg font-medium">
              {remaining ?? "…"} left · {keeperCount ?? "…"} keepers
            </p>
          </div>
          <p className="text-xs text-zinc-500">← archive · keep →</p>
        </div>

        <SwipeFilters
          lots={lots}
          lotFilter={lotFilter}
          latestOnly={latestOnly}
          onLotFilterChange={setLotFilter}
          onLatestOnlyChange={setLatestOnly}
        />

        <div className="relative mx-auto aspect-[3/4] w-full max-w-md flex-1">
          {loading ? (
            <div className="flex h-full items-center justify-center text-zinc-500">
              Loading deck…
            </div>
          ) : visible.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="text-xl font-medium">Queue cleared</p>
              <p className="text-sm text-zinc-400">
                No mockups match these filters, or everything has been reviewed.
              </p>
              <a
                href="/library"
                className="mt-2 rounded-full bg-zinc-100 px-5 py-2 text-sm font-medium text-zinc-900"
              >
                Open library
              </a>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {visible
                .slice()
                .reverse()
                .map((mockup, index, arr) => (
                  <SwipeCard
                    key={mockup.id}
                    mockup={mockup}
                    isTop={index === arr.length - 1}
                    onSwipe={handleSwipe}
                  />
                ))}
            </AnimatePresence>
          )}
        </div>

        {visible.length > 0 && (
          <div className="mt-6 flex justify-center gap-6">
            <button
              type="button"
              onClick={() => handleSwipe(false)}
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-rose-400/60 text-2xl text-rose-400 transition hover:bg-rose-400/10"
              aria-label="Archive"
            >
              ✕
            </button>
            <button
              type="button"
              onClick={() => handleSwipe(true)}
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-400/60 text-2xl text-emerald-400 transition hover:bg-emerald-400/10"
              aria-label="Keep"
            >
              ♥
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
