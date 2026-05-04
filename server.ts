import { file, write } from "bun";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  byIds,
  queries,
  viewInfographic,
  type InfographicView,
} from "./db";
import {
  buildPrompt,
  fetchWikiSummary,
  parseWikipediaUrl,
} from "./wiki";
import {
  IMAGE_MODEL,
  IMAGE_QUALITY,
  IMAGE_SIZE,
  generateImage,
} from "./openai";
import { CATEGORY_BY_KEY, classify } from "./categories";

const PORT = Number(process.env.PORT ?? 3939);
const IMAGES_DIR = "data/images";

function jsonError(err: unknown, status = 400) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("error:", msg);
  return Response.json({ error: msg }, { status });
}

async function processInBackground(infographicId: string, wikiUrl: string) {
  try {
    const { lang, title } = parseWikipediaUrl(wikiUrl);
    const summary = await fetchWikiSummary(lang, title);
    const categoryKey = await classify({
      title: summary.title,
      description: summary.description,
      extract: summary.extract,
    });
    const style = categoryKey ? CATEGORY_BY_KEY[categoryKey].style : undefined;
    const prompt = buildPrompt(summary, style);
    console.log(
      `gen ${infographicId} category=${categoryKey ?? "default"} title="${summary.title}"`,
    );
    const buffer = await generateImage(prompt);
    const imagePath = `${infographicId}.png`;
    await write(join(IMAGES_DIR, imagePath), buffer);
    queries.markDone.run(
      summary.title,
      lang,
      summary.description ?? "",
      summary.extract ?? "",
      imagePath,
      prompt,
      IMAGE_MODEL,
      IMAGE_QUALITY,
      IMAGE_SIZE,
      categoryKey,
      Date.now(),
      infographicId,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`gen ${infographicId} failed:`, msg);
    queries.markError.run(msg, Date.now(), infographicId);
  }
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === "GET" && path === "/") {
      return new Response(file("public/index.html"));
    }

    if (req.method === "GET" && path.startsWith("/images/")) {
      const name = path.slice("/images/".length);
      if (!/^[a-f0-9-]+\.png$/i.test(name)) return new Response("bad", { status: 400 });
      const fp = join(IMAGES_DIR, name);
      if (!existsSync(fp)) return new Response("not found", { status: 404 });
      return new Response(file(fp), {
        headers: { "Cache-Control": "public, max-age=31536000, immutable" },
      });
    }

    if (req.method === "POST" && path === "/generate") {
      try {
        const { url: wikiUrl } = (await req.json()) as { url: string };
        const { canonical } = parseWikipediaUrl(wikiUrl);
        const id = crypto.randomUUID();
        queries.insertInfographic.run(id, canonical, Date.now());
        processInBackground(id, canonical);
        const row = queries.getById.get(id);
        return Response.json({ infographic: row ? viewInfographic(row) : null });
      } catch (err) {
        return jsonError(err);
      }
    }

    if (req.method === "GET" && path === "/by-url") {
      try {
        const wikiUrl = url.searchParams.get("url");
        if (!wikiUrl) return jsonError(new Error("missing url"));
        const { canonical } = parseWikipediaUrl(wikiUrl);
        const rows = queries.byUrl.all(canonical, 100);
        const results: InfographicView[] = rows.map(viewInfographic);
        return Response.json({ results });
      } catch (err) {
        return jsonError(err);
      }
    }

    if (req.method === "POST" && path === "/by-ids") {
      try {
        const { ids } = (await req.json()) as { ids: string[] };
        const filtered = (ids ?? [])
          .filter((s) => typeof s === "string" && /^[a-f0-9-]{10,64}$/i.test(s))
          .slice(0, 500);
        const rows = byIds(filtered);
        const results: InfographicView[] = rows.map(viewInfographic);
        return Response.json({ results });
      } catch (err) {
        return jsonError(err);
      }
    }

    if (req.method === "GET" && path === "/gallery") {
      try {
        const rows = queries.galleryDone.all(120);
        const results: InfographicView[] = rows.map(viewInfographic);
        return Response.json({ results });
      } catch (err) {
        return jsonError(err);
      }
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`wikigraphica listening on http://localhost:${server.port}`);
