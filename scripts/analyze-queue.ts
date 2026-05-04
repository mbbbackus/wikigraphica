import { existsSync } from "node:fs";

const QUEUE_FILE = process.env.QUEUE_FILE ?? "data/queue.json";
const OUT_FILE = process.env.OUT_FILE ?? "data/queue-analysis.json";
const SAMPLE = Number(process.env.SAMPLE ?? 100);
const MIN_INTERVAL_MS = 600;
const USER_AGENT = "wikigraphica/0.1 (analysis; ben@greptile.com)";

if (!existsSync(QUEUE_FILE)) {
  console.error(`${QUEUE_FILE} not found`);
  process.exit(1);
}

type Entry = { url: string; title: string; description?: string };
type Sample = {
  title: string;
  bytes: number;
  sectionCount: number;
  topSections: string[];
};

const queue: Entry[] = JSON.parse(await Bun.file(QUEUE_FILE).text());
console.log(`Loaded ${queue.length} entries; sampling ${Math.min(SAMPLE, queue.length)}`);

const sample = [...queue].sort(() => Math.random() - 0.5).slice(0, SAMPLE);

let last = 0;
async function politeFetch(url: string): Promise<Response> {
  const wait = Math.max(0, last + MIN_INTERVAL_MS - Date.now());
  if (wait > 0) await Bun.sleep(wait);
  last = Date.now();
  return await fetch(url, { headers: { "User-Agent": USER_AGENT } });
}

async function fetchSize(title: string): Promise<number | null> {
  const slug = encodeURIComponent(title.replace(/ /g, "_"));
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${slug}&prop=info&format=json&origin=*`;
  try {
    const r = await politeFetch(url);
    if (!r.ok) return null;
    const d = (await r.json()) as { query?: { pages?: Record<string, { length?: number }> } };
    const page = d.query?.pages && Object.values(d.query.pages)[0];
    return page?.length ?? null;
  } catch {
    return null;
  }
}

async function fetchSections(title: string): Promise<string[] | null> {
  const slug = encodeURIComponent(title.replace(/ /g, "_"));
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${slug}&prop=sections&format=json&origin=*`;
  try {
    const r = await politeFetch(url);
    if (!r.ok) return null;
    const d = (await r.json()) as {
      parse?: { sections?: Array<{ line: string; toclevel: number }> };
    };
    return (d.parse?.sections ?? [])
      .filter((s) => s.toclevel === 1)
      .map((s) => s.line);
  } catch {
    return null;
  }
}

const out: Sample[] = [];
for (let i = 0; i < sample.length; i++) {
  const e = sample[i];
  const [bytes, sections] = await Promise.all([
    fetchSize(e.title),
    fetchSections(e.title),
  ]);
  if (bytes === null && sections === null) {
    console.log(`[${i + 1}/${sample.length}] SKIP ${e.title}`);
    continue;
  }
  const row: Sample = {
    title: e.title,
    bytes: bytes ?? 0,
    sectionCount: sections?.length ?? 0,
    topSections: sections?.slice(0, 8) ?? [],
  };
  out.push(row);
  console.log(
    `[${i + 1}/${sample.length}] ${e.title} — ${bytes ?? "?"} bytes, ${sections?.length ?? "?"} sections`,
  );
}

await Bun.write(OUT_FILE, JSON.stringify(out, null, 2));

// Stats
function bucket(bytes: number): string {
  if (bytes < 5_000) return "tiny (<5kb)";
  if (bytes < 25_000) return "small (5–25kb)";
  if (bytes < 75_000) return "medium (25–75kb)";
  if (bytes < 200_000) return "large (75–200kb)";
  return "huge (>200kb)";
}

const buckets: Record<string, number> = {};
const sectionDist: Record<string, number> = { "0": 0, "1–3": 0, "4–8": 0, "9–15": 0, "16+": 0 };
let totalBytes = 0;
let totalSections = 0;

for (const r of out) {
  const b = bucket(r.bytes);
  buckets[b] = (buckets[b] ?? 0) + 1;
  totalBytes += r.bytes;
  totalSections += r.sectionCount;
  if (r.sectionCount === 0) sectionDist["0"]++;
  else if (r.sectionCount <= 3) sectionDist["1–3"]++;
  else if (r.sectionCount <= 8) sectionDist["4–8"]++;
  else if (r.sectionCount <= 15) sectionDist["9–15"]++;
  else sectionDist["16+"]++;
}

console.log(`\n=== ANALYSIS (${out.length} pages) ===\n`);
console.log("Size buckets:");
for (const [k, v] of Object.entries(buckets).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(20)} ${v} (${Math.round((v / out.length) * 100)}%)`);
}
console.log(`\nMean size: ${Math.round(totalBytes / out.length)} bytes`);
console.log(
  `Median size: ${[...out].sort((a, b) => a.bytes - b.bytes)[Math.floor(out.length / 2)].bytes} bytes`,
);
console.log(`\nSection-count distribution:`);
for (const [k, v] of Object.entries(sectionDist)) {
  console.log(`  ${k.padEnd(20)} ${v} (${Math.round((v / out.length) * 100)}%)`);
}
console.log(`\nMean sections: ${(totalSections / out.length).toFixed(1)}`);
console.log(`\nWritten to ${OUT_FILE}`);
