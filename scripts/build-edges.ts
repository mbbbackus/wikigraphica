import { existsSync } from "node:fs";

const QUEUE_FILE = process.env.QUEUE_FILE ?? "data/queue.json";
const EDGES_FILE = process.env.EDGES_FILE ?? "data/edges.json";
const MIN_INTERVAL_MS = Number(process.env.WIKI_MIN_INTERVAL_MS ?? 600);
const USER_AGENT = "wikigraphica/0.1 (build-edges; ben@greptile.com)";

if (!existsSync(QUEUE_FILE)) {
  console.error(`${QUEUE_FILE} not found`);
  process.exit(1);
}

type Entry = { url: string; title: string };
type Edge = { source: string; target: string };

const queue: Entry[] = JSON.parse(await Bun.file(QUEUE_FILE).text());
const titlesInQueue = new Set(queue.map((e) => e.title));

let edges: Edge[] = existsSync(EDGES_FILE)
  ? JSON.parse(await Bun.file(EDGES_FILE).text())
  : [];
const processedSources = new Set(edges.map((e) => e.source));
console.log(
  `Queue: ${queue.length} titles. Existing edges: ${edges.length} (${processedSources.size} processed sources).`,
);

let last = 0;
async function politeFetch(url: string): Promise<Response> {
  const wait = Math.max(0, last + MIN_INTERVAL_MS - Date.now());
  if (wait > 0) await Bun.sleep(wait);
  last = Date.now();
  return await fetch(url, { headers: { "User-Agent": USER_AGENT } });
}

async function getPageLinks(title: string): Promise<string[] | null> {
  const slug = encodeURIComponent(title.replace(/ /g, "_"));
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${slug}&prop=links&format=json&origin=*`;
  try {
    const r = await politeFetch(url);
    if (r.status === 429) {
      const retryAfter = Number(r.headers.get("retry-after") ?? 5);
      console.warn(`429 — sleeping ${retryAfter}s`);
      await Bun.sleep(retryAfter * 1000);
      return null;
    }
    if (!r.ok) return null;
    const d = (await r.json()) as {
      parse?: { links?: Array<{ ns: number; exists?: string; "*": string }> };
    };
    return (d?.parse?.links ?? [])
      .filter((l) => l.ns === 0 && l.exists !== undefined && l["*"])
      .map((l) => String(l["*"]));
  } catch {
    return null;
  }
}

async function save() {
  await Bun.write(EDGES_FILE, JSON.stringify(edges));
}

let processed = 0;
for (let i = 0; i < queue.length; i++) {
  const entry = queue[i];
  if (processedSources.has(entry.title)) continue;

  const links = await getPageLinks(entry.title);
  if (!links) {
    console.warn(`[${i + 1}/${queue.length}] ${entry.title}: links fetch failed`);
    continue;
  }

  let added = 0;
  for (const link of links) {
    if (titlesInQueue.has(link) && link !== entry.title) {
      edges.push({ source: entry.title, target: link });
      added++;
    }
  }
  processedSources.add(entry.title);
  processed++;

  console.log(
    `[${i + 1}/${queue.length}] ${entry.title}: +${added} (total edges ${edges.length})`,
  );

  if (processed % 25 === 0) await save();
}

await save();
console.log(`\nDone. Saved ${edges.length} edges to ${EDGES_FILE}.`);
