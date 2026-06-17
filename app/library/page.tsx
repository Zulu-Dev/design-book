"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { createBrowserClient } from "@/lib/supabase";
import type { MockupWithVote } from "@/lib/database.types";

type Filter = "all" | "Ryan" | "Jackson";

export default function LibraryPage() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [keepers, setKeepers] = useState<MockupWithVote[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [preview, setPreview] = useState<MockupWithVote | null>(null);

  const loadKeepers = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("votes")
      .select("voter, liked, created_at, mockups(*)")
      .eq("liked", true)
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("voter", filter);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const rows: MockupWithVote[] = (data ?? [])
      .filter((row) => row.mockups)
      .map((row) => {
        const mockup = Array.isArray(row.mockups) ? row.mockups[0] : row.mockups;
        return {
          ...mockup,
          votes: {
            voter: row.voter,
            liked: row.liked,
            created_at: row.created_at,
          },
        };
      });

    setKeepers(rows);
    setLoading(false);
  }, [supabase, filter]);

  useEffect(() => {
    loadKeepers();

    const channel = supabase
      .channel("library-votes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes" },
        () => loadKeepers(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, loadKeepers]);

  async function downloadZip() {
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("voter", filter);

      const response = await fetch(`/api/download?${params.toString()}`);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        filter === "all"
          ? "design-book-keepers.zip"
          : `design-book-keepers-${filter.toLowerCase()}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Download failed. Try again in a moment.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <AppHeader active="library" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Keepers</h1>
            <p className="text-sm text-zinc-400">
              {keepers.length} keepers · goal ~300
            </p>
          </div>

          <button
            type="button"
            onClick={downloadZip}
            disabled={downloading || keepers.length === 0}
            className="rounded-full bg-zinc-100 px-5 py-2 text-sm font-medium text-zinc-900 disabled:opacity-40"
          >
            {downloading ? "Preparing ZIP…" : "Download all as ZIP"}
          </button>
        </div>

        <div className="mb-6 flex gap-2">
          {(["all", "Ryan", "Jackson"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                filter === option
                  ? "bg-zinc-100 text-zinc-900"
                  : "border border-zinc-800 text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {option === "all" ? "All" : `Liked by ${option}`}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-zinc-500">Loading keepers…</p>
        ) : keepers.length === 0 ? (
          <p className="text-zinc-500">No keepers yet. Start swiping!</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {keepers.map((mockup) => (
              <button
                key={mockup.id}
                type="button"
                onClick={() => setPreview(mockup)}
                className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 text-left transition hover:border-zinc-600"
              >
                <div className="relative aspect-square">
                  <Image
                    src={mockup.url}
                    alt={mockup.filename}
                    fill
                    className="object-contain p-2"
                    sizes="200px"
                    unoptimized
                  />
                </div>
                <div className="border-t border-zinc-800 px-2 py-2">
                  <p className="truncate text-xs text-zinc-300">
                    {mockup.filename}
                  </p>
                  <p className="text-[11px] text-emerald-400">
                    Liked by {mockup.votes?.voter}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[3/4] max-h-[70vh] w-full">
              <Image
                src={preview.url}
                alt={preview.filename}
                fill
                className="object-contain p-4"
                sizes="768px"
                unoptimized
              />
            </div>
            <div className="border-t border-zinc-800 px-5 py-4">
              <p className="font-medium">{preview.filename}</p>
              <p className="text-sm text-emerald-400">
                Liked by {preview.votes?.voter}
              </p>
              {preview.design_id && (
                <p className="text-xs text-zinc-500">
                  {preview.design_id}
                  {preview.version ? ` · V${preview.version}` : ""}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="absolute right-3 top-3 rounded-full bg-zinc-950/80 px-3 py-1 text-sm text-zinc-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
