import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { parseMockupUrl } from "../lib/parse-mockup-url";
import type { Database } from "../lib/database.types";

config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and anon/service key in .env.local");
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

const CSV_PATH = resolve(
  process.cwd(),
  "c7dbeb.Design Versions - O7.csv",
);
const BATCH_SIZE = 500;

async function main() {

  const raw = readFileSync(CSV_PATH, "utf-8");
  const lines = raw.split(/\r?\n/).slice(1).filter(Boolean);

  const seen = new Set<string>();
  const rows: Array<{
    url: string;
    filename: string;
    design_id: string | null;
    version: number | null;
    position: number;
  }> = [];

  for (const line of lines) {
    const url = line.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);

    const parsed = parseMockupUrl(url);
    rows.push({
      url: parsed.url,
      filename: parsed.filename,
      design_id: parsed.designId,
      version: parsed.version,
      position: rows.length,
    });
  }

  console.log(`Importing ${rows.length} unique mockups...`);

  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("mockups").upsert(batch, {
      onConflict: "url",
      ignoreDuplicates: true,
    });

    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, error.message);
      process.exit(1);
    }

    inserted += batch.length;
    console.log(`  ${inserted}/${rows.length}`);
  }

  const { count } = await supabase
    .from("mockups")
    .select("*", { count: "exact", head: true });

  console.log(`Done. ${count ?? 0} mockups in database.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
