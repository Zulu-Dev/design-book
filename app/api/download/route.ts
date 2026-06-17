import { ZipArchive } from "archiver";
import { PassThrough, Readable } from "node:stream";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export const runtime = "nodejs";
export const maxDuration = 300;

const CONCURRENCY = 6;

type KeeperRow = {
  filename: string;
  url: string;
};

function createQueryClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient<Database>(url, key);
}

async function fetchKeepers(voter: string | null): Promise<KeeperRow[]> {
  const supabase = createQueryClient();

  let query = supabase
    .from("votes")
    .select("mockups(filename, url)")
    .eq("liked", true);

  if (voter === "Ryan" || voter === "Jackson") {
    query = query.eq("voter", voter);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const mockup = Array.isArray(row.mockups) ? row.mockups[0] : row.mockups;
      return mockup as KeeperRow | null;
    })
    .filter((row): row is KeeperRow => Boolean(row?.url))
    .filter(
      (row, index, arr) => arr.findIndex((r) => r.url === row.url) === index,
    );
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current], current);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

function nodeStreamToWeb(stream: PassThrough): ReadableStream<Uint8Array> {
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const voter = searchParams.get("voter");

  try {
    const keepers = await fetchKeepers(voter);

    if (keepers.length === 0) {
      return new Response("No keepers to download", { status: 404 });
    }

    const passThrough = new PassThrough();
    const archive = new ZipArchive({ zlib: { level: 5 } });

    archive.on("error", (err) => {
      passThrough.destroy(err);
    });

    archive.pipe(passThrough);

    const usedNames = new Map<string, number>();

    function uniqueName(filename: string): string {
      const count = usedNames.get(filename) ?? 0;
      usedNames.set(filename, count + 1);
      if (count === 0) return filename;
      const dot = filename.lastIndexOf(".");
      if (dot === -1) return `${filename}-${count + 1}`;
      return `${filename.slice(0, dot)}-${count + 1}${filename.slice(dot)}`;
    }

    void (async () => {
      await mapWithConcurrency(keepers, CONCURRENCY, async (keeper) => {
        try {
          const buffer = await fetchImageBuffer(keeper.url);
          archive.append(buffer, { name: uniqueName(keeper.filename) });
        } catch (err) {
          console.error(`Skipping ${keeper.filename}:`, err);
        }
      });

      await archive.finalize();
    })();

    const suffix =
      voter === "Ryan" || voter === "Jackson"
        ? `-${voter.toLowerCase()}`
        : "";

    return new Response(nodeStreamToWeb(passThrough), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="design-book-keepers${suffix}.zip"`,
      },
    });
  } catch (err) {
    console.error(err);
    return new Response("Download failed", { status: 500 });
  }
}
