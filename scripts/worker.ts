const QUEUE_FILE = process.env.QUEUE_FILE ?? "data/queue.json";
const SERVER = process.env.SERVER_URL ?? "http://localhost:3939";
const POLL_MS = Number(process.env.POLL_MS ?? 3000);
const MAX = Number(process.env.MAX ?? 0); // 0 = no limit

type Entry = { url: string; title: string };

const queue: Entry[] = JSON.parse(await Bun.file(QUEUE_FILE).text());
console.log(`Loaded ${queue.length} queue entries from ${QUEUE_FILE}`);
console.log(`Server: ${SERVER}\n`);

let processed = 0;
let skipped = 0;
let failed = 0;

const startedAt = Date.now();

function fmtElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}h${m}m${sec}s` : `${m}m${sec}s`;
}

for (let i = 0; i < queue.length; i++) {
  if (MAX > 0 && processed >= MAX) {
    console.log(`Reached MAX=${MAX}; stopping.`);
    break;
  }
  const item = queue[i];

  let exists = false;
  try {
    const r = await fetch(
      `${SERVER}/by-url?url=${encodeURIComponent(item.url)}`,
    );
    const d = (await r.json()) as { results?: Array<{ status: string }> };
    exists = !!d.results?.some((row) => row.status === "done");
  } catch {}
  if (exists) {
    skipped++;
    console.log(`[${i + 1}/${queue.length}] skip (already done) — ${item.title}`);
    continue;
  }

  let id: string | null = null;
  try {
    const r = await fetch(`${SERVER}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: item.url }),
    });
    const d = (await r.json()) as { infographic?: { id: string }; error?: string };
    if (!r.ok || !d.infographic) {
      failed++;
      console.warn(`[${i + 1}/${queue.length}] fail to enqueue: ${d.error}`);
      continue;
    }
    id = d.infographic.id;
  } catch (err) {
    failed++;
    console.warn(`[${i + 1}/${queue.length}] enqueue error:`, err);
    continue;
  }

  const start = Date.now();
  console.log(
    `[${i + 1}/${queue.length}] gen ${id.slice(0, 8)} — ${item.title}`,
  );

  while (true) {
    await Bun.sleep(POLL_MS);
    try {
      const r = await fetch(`${SERVER}/by-ids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      const d = (await r.json()) as {
        results?: Array<{ status: string; error?: string; category?: string }>;
      };
      const row = d.results?.[0];
      if (!row) continue;
      if (row.status === "done") {
        processed++;
        const took = Math.round((Date.now() - start) / 1000);
        const totalElapsed = fmtElapsed(Date.now() - startedAt);
        console.log(
          `  ✓ done in ${took}s · category=${row.category ?? "default"} · total ${processed}/${MAX || queue.length} · elapsed ${totalElapsed}`,
        );
        break;
      }
      if (row.status === "error") {
        failed++;
        console.warn(`  ✗ error: ${row.error}`);
        break;
      }
    } catch {}
  }
}

console.log(
  `\nDone. processed=${processed} skipped=${skipped} failed=${failed} elapsed=${fmtElapsed(
    Date.now() - startedAt,
  )}`,
);
