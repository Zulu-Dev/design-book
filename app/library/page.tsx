"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { createBrowserClient } from "@/lib/supabase";
import type { Mockup } from "@/lib/database.types";

type Filter = "all" | "Ryan" | "Jackson";
type Voter = "Ryan" | "Jackson";
type Keeper = Mockup & { voters: Voter[] };

export default function LibraryPage() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [keepers, setKeepers] = useState<Keeper[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [preview, setPreview] = useState<Keeper | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [removing, setRemoving] = useState(false);

  const loadKeepers = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("votes")
      .select("voter, liked, created_at, mockups(*)")
      .eq("liked", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const byId = new Map<string, Keeper>();
    for (const row of data ?? []) {
      const mockup = Array.isArray(row.mockups) ? row.mockups[0] : row.mockups;
      if (!mockup) continue;
      const existing = byId.get(mockup.id);
      if (existing) {
        if (!existing.voters.includes(row.voter)) {
          existing.voters.push(row.voter);
        }
      } else {
        byId.set(mockup.id, { ...mockup, voters: [row.voter] });
      }
    }

    setKeepers([...byId.values()]);
    setLoading(false);
  }, [supabase]);

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

  const visible = keepers.filter(
    (k) => filter === "all" || k.voters.includes(filter),
  );

  function toggleSelectMode() {
    setSelectMode((prev) => !prev);
    setSelected(new Set());
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(visible.map((k) => k.id)));
  }

  async function removeSelected() {
    if (selected.size === 0 || removing) return;
    setRemoving(true);

    const ids = [...selected];
    setKeepers((prev) => prev.filter((k) => !selected.has(k.id)));

    const { error } = await supabase.from("votes").delete().in("mockup_id", ids);

    if (error) {
      console.error(error);
      await loadKeepers();
    }

    setSelected(new Set());
    setSelectMode(false);
    setRemoving(false);
  }

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
          ? "design-book-library.zip"
          : `design-book-library-${filter.toLowerCase()}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Download failed. Try again in a moment.");
    } finally {
      setDownloading(false);
    }
  }

  function exportLinks() {
    if (visible.length === 0) return;

    const escape = (value: string) =>
      /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

    const header = ["url", "filename", "lot_id", "design_id", "version", "liked_by"];
    const rows = visible.map((k) =>
      [
        k.url,
        k.filename,
        k.lot_id ?? "",
        k.design_id ?? "",
        k.version != null ? `V${k.version}` : "",
        likedLabel(k.voters),
      ]
        .map((cell) => escape(String(cell)))
        .join(","),
    );

    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      filter === "all"
        ? "design-book-links.csv"
        : `design-book-links-${filter.toLowerCase()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleCardClick(keeper: Keeper) {
    if (selectMode) {
      toggleSelected(keeper.id);
    } else {
      setPreview(keeper);
    }
  }

  function likedLabel(voters: Voter[]) {
    if (voters.length === 2) return "Ryan & Jackson";
    return voters[0];
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <div className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <AppHeader active="library" />
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold leading-tight">Library</h1>
            <p className="text-xs text-zinc-400">
              {visible.length} liked designs · goal ~300
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectMode}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                selectMode
                  ? "bg-zinc-700 text-white"
                  : "border border-zinc-700 text-zinc-200 hover:border-zinc-500"
              }`}
            >
              {selectMode ? "Done" : "Select"}
            </button>
            <button
              type="button"
              onClick={exportLinks}
              disabled={visible.length === 0}
              className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 disabled:opacity-40"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => void downloadZip()}
              disabled={downloading || visible.length === 0}
              className="rounded-full bg-emerald-500 px-5 py-1.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-40"
            >
              {downloading ? "Preparing ZIP…" : "Download ZIP"}
            </button>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-7xl gap-2 px-4 pb-3">
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
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5">
        {loading ? (
          <p className="text-zinc-500">Loading library…</p>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-zinc-400">No liked designs yet.</p>
            <Link
              href="/catalog"
              className="mt-3 inline-block text-sm text-emerald-400 underline-offset-4 hover:underline"
            >
              Browse the catalog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {visible.map((keeper) => {
              const isSelected = selected.has(keeper.id);
              return (
                <button
                  key={keeper.id}
                  type="button"
                  onClick={() => handleCardClick(keeper)}
                  className={`group relative overflow-hidden rounded-lg border bg-zinc-900 text-left transition ${
                    isSelected
                      ? "border-rose-500 ring-2 ring-rose-500/40"
                      : "border-zinc-800 hover:border-zinc-600"
                  }`}
                >
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={keeper.url}
                      alt={keeper.filename}
                      fill
                      className="object-contain"
                      sizes="(max-width: 640px) 50vw, 200px"
                      unoptimized
                    />
                    {selectMode && (
                      <span
                        className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${
                          isSelected
                            ? "border-rose-400 bg-rose-500 text-white"
                            : "border-zinc-400 bg-zinc-950/70 text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-zinc-800 px-2 py-1">
                    <span className="truncate text-[10px] text-zinc-400">
                      {[keeper.lot_id, keeper.design_id]
                        .filter(Boolean)
                        .join(" · ") || keeper.filename}
                    </span>
                    <span className="shrink-0 text-[10px] font-medium text-emerald-400">
                      {likedLabel(keeper.voters)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {selectMode && (
        <div className="sticky bottom-0 z-30 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <p className="text-sm text-zinc-300">{selected.size} selected</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-200 hover:border-zinc-500"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                disabled={selected.size === 0}
                className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-200 hover:border-zinc-500 disabled:opacity-40"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => void removeSelected()}
                disabled={selected.size === 0 || removing}
                className="rounded-full bg-rose-500 px-5 py-1.5 text-sm font-medium text-white transition hover:bg-rose-400 disabled:opacity-40"
              >
                {removing ? "Removing…" : "Remove selected"}
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[4/3] max-h-[70vh] w-full">
              <Image
                src={preview.url}
                alt={preview.filename}
                fill
                className="object-contain p-4"
                sizes="768px"
                unoptimized
              />
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-zinc-800 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{preview.filename}</p>
                <p className="text-xs text-zinc-500">
                  {[preview.lot_id, preview.design_id]
                    .filter(Boolean)
                    .join(" · ")}
                  {preview.version ? ` · V${preview.version}` : ""}
                </p>
              </div>
              <p className="shrink-0 text-sm text-emerald-400">
                Liked by {likedLabel(preview.voters)}
              </p>
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
