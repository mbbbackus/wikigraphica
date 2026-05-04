import { existsSync } from "node:fs";

const QUEUE_FILE = process.env.QUEUE_FILE ?? "data/queue.json";
const TARGET = Number(process.env.TARGET ?? 1000);
const HOPS_PER_SEED = Number(process.env.HOPS_PER_SEED ?? 6);
const MIN_REQUEST_INTERVAL_MS = Number(process.env.WIKI_MIN_INTERVAL_MS ?? 600);
const USER_AGENT = "wikigraphica/0.1 (https://github.com/bbackus; ben@greptile.com)";

let lastWikiCallAt = 0;
async function politeWikiFetch(url: string): Promise<Response> {
  const wait = Math.max(0, lastWikiCallAt + MIN_REQUEST_INTERVAL_MS - Date.now());
  if (wait > 0) await Bun.sleep(wait);
  lastWikiCallAt = Date.now();
  return await fetch(url, { headers: { "User-Agent": USER_AGENT } });
}

type Entry = { url: string; title: string; description?: string };

let queue: Entry[] = existsSync(QUEUE_FILE)
  ? JSON.parse(await Bun.file(QUEUE_FILE).text())
  : [];
const seen = new Set(queue.map((e) => e.title));
console.log(
  `Resuming with ${queue.length} existing entries; target ${TARGET}, hops/seed ${HOPS_PER_SEED}`,
);

function urlFor(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

function isWorthwhile(title: string): boolean {
  if (!title) return false;
  if (title.length < 3) return false;
  if (title.startsWith("List of ")) return false;
  if (title.startsWith("Index of ")) return false;
  if (title.startsWith("Outline of ")) return false;
  if (title.includes("(disambiguation)")) return false;
  if (/^\d+$/.test(title)) return false;
  return true;
}

async function save() {
  await Bun.write(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let delay = 500;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      console.warn(`${label} error, retrying in ${delay}ms:`, err);
      await Bun.sleep(delay);
      delay = Math.min(delay * 2, 30_000);
    }
  }
}

async function getRandomArticle(): Promise<Entry> {
  while (true) {
    const d = await withRetry("random", async () => {
      const r = await politeWikiFetch(
        "https://en.wikipedia.org/api/rest_v1/page/random/summary",
      );
      if (r.status === 429) {
        const retryAfter = Number(r.headers.get("retry-after") ?? 5);
        await Bun.sleep(retryAfter * 1000);
        throw new Error(`429 (slept ${retryAfter}s)`);
      }
      if (!r.ok) throw new Error(`random ${r.status}`);
      return (await r.json()) as { title: string; description?: string };
    });
    if (!isWorthwhile(d.title)) continue;
    return { title: d.title, url: urlFor(d.title), description: d.description };
  }
}

async function getPageLinks(title: string): Promise<string[]> {
  const slug = encodeURIComponent(title.replace(/ /g, "_"));
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${slug}&prop=links&format=json&origin=*`;
  try {
    const r = await politeWikiFetch(url);
    if (!r.ok) return [];
    const d = (await r.json()) as {
      parse?: { links?: Array<{ ns: number; exists?: string; "*": string }> };
    };
    return (d?.parse?.links ?? [])
      .filter((l) => l.ns === 0 && l.exists !== undefined && l["*"])
      .map((l) => String(l["*"]))
      .filter(isWorthwhile);
  } catch {
    return [];
  }
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function maybeAdd(entry: Entry): Promise<boolean> {
  if (seen.has(entry.title)) return false;
  if (!isWorthwhile(entry.title)) return false;
  seen.add(entry.title);
  queue.push(entry);
  const tag = entry.description ? ` — ${entry.description}` : "";
  console.log(`[${queue.length}/${TARGET}] ${entry.title}${tag}`);
  if (queue.length % 25 === 0) {
    await save();
    console.log(`  saved checkpoint`);
  }
  return true;
}

while (queue.length < TARGET) {
  // Fresh random seed
  const seed = await getRandomArticle();
  await maybeAdd(seed);

  // Walk from seed
  let current: Entry = seed;
  for (let hop = 0; hop < HOPS_PER_SEED && queue.length < TARGET; hop++) {
    const links = await getPageLinks(current.title);
    const candidates = links.filter((l) => !seen.has(l));
    if (!candidates.length) break;
    const next = pickRandom(candidates);
    const entry: Entry = { title: next, url: urlFor(next) };
    await maybeAdd(entry);
    current = entry;
  }
}

await save();
console.log(`\nDone. Saved ${queue.length} entries to ${QUEUE_FILE}.`);
