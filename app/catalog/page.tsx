"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { CatalogCard } from "@/components/catalog-card";
import { CatalogSkeleton } from "@/components/catalog-skeleton";
import { FloatingLibraryButton } from "@/components/floating-library-button";
import { ScrollProgress } from "@/components/scroll-progress";
import { readStoredZoom, ZoomDial } from "@/components/zoom-dial";
import { useCatalogScrollProgress } from "@/hooks/use-catalog-scroll-progress";
import { createBrowserClient } from "@/lib/supabase";
import type { CatalogMockup } from "@/lib/database.types";
import type { ZoomLevel } from "@/lib/zoom";
import { getStoredVoter, type VoterName } from "@/lib/voter";

const PAGE_SIZE = 60;

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
  const [zoom, setZoom] = useState<ZoomLevel>(1.5);
  const scrollPercent = useCatalogScrollProgress(total);

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
    setZoom(readStoredZoom());
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
    void setLike(mockup, !likedByMe);
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <div className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <AppHeader active="catalog" />
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <div>
            <p className="text-xs text-zinc-400">
              {voter} · {keeperCount ?? "…"} liked · {total ?? "…"} designs
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ScrollProgress percent={scrollPercent} />
            <ZoomDial zoom={zoom} onZoomChange={setZoom} />
            <Link
              href="/library"
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-200 transition hover:border-emerald-500/50 hover:text-white"
            >
              Library
              {keeperCount !== null ? ` (${keeperCount})` : ""}
            </Link>
          </div>
        </div>
      </div>

      <FloatingLibraryButton count={keeperCount} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5">
        {loading ? (
          <CatalogSkeleton />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {mockups.map((mockup) => (
              <CatalogCard
                key={mockup.id}
                mockup={mockup}
                voter={voter!}
                zoom={zoom}
                onToggleLike={() => toggleLike(mockup)}
              />
            ))}
          </div>
        )}

        <div ref={loadMoreRef} className="py-6">
          {loadingMore && (
            <div className="mx-auto h-1 max-w-xs overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-emerald-500/60" />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
