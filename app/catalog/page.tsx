"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { createBrowserClient } from "@/lib/supabase";
import type { CatalogMockup } from "@/lib/database.types";
import { getStoredVoter, type VoterName } from "@/lib/voter";

const PAGE_SIZE = 60;

type LastToggle = { mockupId: string; previousLiked: boolean };

export default function CatalogPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef(-1);
  const statsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [voter, setVoter] = useState<VoterName | null>(null);
  const [mockups, setMockups] = useState<CatalogMockup[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [keeperCount, setKeeperCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastToggle, setLastToggle] = useState<LastToggle | null>(null);

  const loadStats = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_queue_stats");
    if (error) {
      console.error(error);
      return;
    }
    const stats = data?.[0];
    if (stats) {
      setTotal(Number(stats.total));
      setKeeperCount(Number(stats.keepers));
    }
  }, [supabase]);

  const scheduleStats = useCallback(() => {
    if (statsTimer.current) clearTimeout(statsTimer.current);
    statsTimer.current = setTimeout(() => void loadStats(), 350);
  }, [loadStats]);

  const fetchRows = useCallback(
    async (afterPosition: number) => {
      const { data, error } = await supabase.rpc("get_catalog_mockups", {
        batch_limit: PAGE_SIZE,
        after_position: afterPosition,
      });
      if (error) {
        console.error(error);
        return [];
      }
      return data ?? [];
    },
    [supabase],
  );

  const setLikedFlag = useCallback(
    (mockupId: string, who: VoterName, liked: boolean) => {
      const key = who === "Ryan" ? "liked_by_ryan" : "liked_by_jackson";
      setMockups((prev) =>
        prev.map((m) => (m.id === mockupId ? { ...m, [key]: liked } : m)),
      );
    },
    [],
  );

  useEffect(() => {
    const stored = getStoredVoter();
    if (!stored) {
      router.replace("/");
      return;
    }
    setVoter(stored);
  }, [router]);

  // Initial load: pull pages up to the viewer's resume point, then scroll there.
  useEffect(() => {
    if (!voter) return;
    let cancelled = false;

    async function init(viewer: VoterName) {
      setLoading(true);

      const { data: resumeData } = await supabase.rpc("get_resume_position", {
        viewer,
      });
      const resume = Number(resumeData ?? 0);

      let all: CatalogMockup[] = [];
      let cursor = -1;
      let more = true;

      do {
        const rows = await fetchRows(cursor);
        if (cancelled) return;
        all = [...all, ...rows];
        cursor = rows.length > 0 ? rows[rows.length - 1].position : cursor;
        more = rows.length === PAGE_SIZE;
      } while (more && resume > 0 && cursor < resume);

      cursorRef.current = cursor;
      setMockups(all);
      setHasMore(more);
      await loadStats();
      setLoading(false);

      if (resume > 0) {
        const target = all.find((m) => m.position === resume);
        if (target) {
          requestAnimationFrame(() => {
            setTimeout(() => {
              document
                .getElementById(`m-${target.id}`)
                ?.scrollIntoView({ block: "center" });
            }, 60);
          });
        }
      }
    }

    void init(voter);
    return () => {
      cancelled = true;
    };
  }, [voter, supabase, fetchRows, loadStats]);

  useEffect(() => {
    if (!voter) return;

    const channel = supabase
      .channel("catalog-votes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes" },
        (payload) => {
          const isDelete = payload.eventType === "DELETE";
          const row = (isDelete ? payload.old : payload.new) as {
            mockup_id?: string;
            voter?: VoterName;
            liked?: boolean;
          };
          if (!row.mockup_id || !row.voter) return;
          setLikedFlag(row.mockup_id, row.voter, isDelete ? false : !!row.liked);
          scheduleStats();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, voter, setLikedFlag, scheduleStats]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || loading || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || loadingMore || !hasMore) return;
        setLoadingMore(true);
        void fetchRows(cursorRef.current)
          .then((rows) => {
            if (rows.length > 0) {
              cursorRef.current = rows[rows.length - 1].position;
            }
            setMockups((prev) => {
              const seen = new Set(prev.map((m) => m.id));
              return [...prev, ...rows.filter((r) => !seen.has(r.id))];
            });
            setHasMore(rows.length === PAGE_SIZE);
          })
          .finally(() => setLoadingMore(false));
      },
      { rootMargin: "800px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchRows, hasMore, loading, loadingMore]);

  const setLike = useCallback(
    async (mockup: CatalogMockup, liked: boolean) => {
      if (!voter) return;

      setLikedFlag(mockup.id, voter, liked);

      if (liked) {
        const { error } = await supabase
          .from("votes")
          .upsert(
            { mockup_id: mockup.id, voter, liked: true },
            { onConflict: "mockup_id,voter" },
          );
        if (error) console.error(error);
      } else {
        const { error } = await supabase
          .from("votes")
          .delete()
          .eq("mockup_id", mockup.id)
          .eq("voter", voter);
        if (error) console.error(error);
      }
      scheduleStats();
    },
    [voter, supabase, setLikedFlag, scheduleStats],
  );

  function toggleLike(mockup: CatalogMockup) {
    if (!voter) return;
    const likedByMe =
      voter === "Ryan" ? mockup.liked_by_ryan : mockup.liked_by_jackson;
    setLastToggle({ mockupId: mockup.id, previousLiked: likedByMe });
    void setLike(mockup, !likedByMe);
  }

  function undoLast() {
    if (!lastToggle) return;
    const mockup = mockups.find((m) => m.id === lastToggle.mockupId);
    if (mockup) void setLike(mockup, lastToggle.previousLiked);
    setLastToggle(null);
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <AppHeader active="catalog" />

      <div className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold leading-tight">Catalog</h1>
            <p className="text-xs text-zinc-400">
              {voter} · {keeperCount ?? "…"} keepers · {total ?? "…"} designs
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-zinc-500 sm:inline">
              Tap a design to like it
            </span>
            <button
              type="button"
              onClick={undoLast}
              disabled={!lastToggle}
              className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white disabled:opacity-40"
            >
              Undo
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5">
        {loading ? (
          <p className="text-zinc-500">Loading catalog…</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {mockups.map((mockup) => {
              const likedByMe =
                voter === "Ryan"
                  ? mockup.liked_by_ryan
                  : mockup.liked_by_jackson;
              const likedByThem =
                voter === "Ryan"
                  ? mockup.liked_by_jackson
                  : mockup.liked_by_ryan;

              return (
                <button
                  key={mockup.id}
                  id={`m-${mockup.id}`}
                  type="button"
                  onClick={() => toggleLike(mockup)}
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
              );
            })}
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
