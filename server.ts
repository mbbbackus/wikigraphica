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
  buildSectionPrompt,
  buildInfoboxPrompt,
  fetchWikiSummary,
  parseWikipediaUrl,
} from "./wiki";
import { fetchPageStructure } from "./wiki-structure";
import {
  IMAGE_MODEL,
  IMAGE_QUALITY,
  IMAGE_SIZE,
  generateImage,
} from "./openai";
import {
  CATEGORIES,
  CATEGORY_BY_KEY,
  classify,
  getCategoryColor,
  getCategoryStyle,
} from "./categories";

const PORT = Number(process.env.PORT ?? 3939);
const IMAGES_DIR = "data/images";

function jsonError(err: unknown, status = 400) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("error:", msg);
  return Response.json({ error: msg }, { status });
}

async function generateOne(
  infographicId: string,
  prompt: string,
  meta: {
    lang: string;
    title: string;
    description?: string;
    extract?: string;
    categoryKey: string | null;
    size?: string;
    quality?: string;
  },
) {
  try {
    const size = meta.size ?? IMAGE_SIZE;
    const quality = meta.quality ?? IMAGE_QUALITY;
    const buffer = await generateImage(prompt, { size, quality });
    const imagePath = `${infographicId}.png`;
    await write(join(IMAGES_DIR, imagePath), buffer);
    queries.markDone.run(
      meta.title,
      meta.lang,
      meta.description ?? "",
      meta.extract ?? "",
      imagePath,
      prompt,
      IMAGE_MODEL,
      quality,
      size,
      meta.categoryKey,
      Date.now(),
      infographicId,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`gen ${infographicId} failed:`, msg);
    queries.markError.run(msg, Date.now(), infographicId);
  }
}

async function processInBackground(
  infographicId: string,
  wikiUrl: string,
  forceCategory?: string | null,
) {
  try {
    const { lang, title } = parseWikipediaUrl(wikiUrl);
    const summary = await fetchWikiSummary(lang, title);
    let categoryKey: string | null = null;
    if (forceCategory === "default") {
      categoryKey = null;
    } else if (
      forceCategory &&
      (CATEGORY_BY_KEY as Record<string, unknown>)[forceCategory]
    ) {
      categoryKey = forceCategory;
    } else {
      categoryKey = await classify({
        title: summary.title,
        description: summary.description,
        extract: summary.extract,
      });
    }
    const style = getCategoryStyle(categoryKey);

    // 1. Generate the overview infographic (the request the worker is polling).
    const overviewPrompt = buildPrompt(summary, style);
    // Manual high-quality styles bump to quality=high; everything else uses env default.
    const HIGH_QUALITY_STYLES = new Set(["textbook", "epic"]);
    const overviewQuality = HIGH_QUALITY_STYLES.has(categoryKey ?? "") ? "high" : undefined;
    console.log(
      `gen ${infographicId} OVERVIEW category=${categoryKey ?? "default"} title="${summary.title}"${overviewQuality ? ` quality=${overviewQuality}` : ""}`,
    );
    await generateOne(infographicId, overviewPrompt, {
      lang,
      title: summary.title,
      description: summary.description,
      extract: summary.extract,
      categoryKey,
      quality: overviewQuality,
    });

    // 2. Fan out: fetch structure, save page + sections, queue per-section gens.
    if (process.env.OVERVIEW_ONLY === "true") {
      console.log(`gen ${infographicId} OVERVIEW_ONLY=true → skipping fan-out`);
    } else {
      fanOutSectionsAndInfobox({
        wikiUrl,
        lang,
        summary,
        categoryKey,
        style,
        batchId: infographicId,
      }).catch((err) =>
        console.warn(`fan-out failed for ${wikiUrl}:`, err),
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`gen ${infographicId} failed:`, msg);
    queries.markError.run(msg, Date.now(), infographicId);
  }
}

async function fanOutSectionsAndInfobox(args: {
  wikiUrl: string;
  lang: string;
  summary: { title: string; description?: string; extract: string };
  categoryKey: string | null;
  style: string | undefined;
  batchId: string;
}) {
  const { wikiUrl, lang, summary, categoryKey, style, batchId } = args;
  const structure = await fetchPageStructure(lang, summary.title);
  const pageId = wikiUrl;
  queries.upsertWikiPage.run(
    pageId,
    wikiUrl,
    summary.title,
    lang,
    summary.description ?? null,
    summary.extract ?? null,
    structure.infobox ? JSON.stringify(structure.infobox) : null,
    Date.now(),
  );
  queries.deleteSectionsForPage.run(pageId);

  let idx = 0;
  // Infobox first (index 0)
  if (structure.infobox && structure.infobox.length) {
    const sectionId = crypto.randomUUID();
    queries.insertWikiSection.run(
      sectionId,
      pageId,
      idx++,
      "infobox",
      "Infobox",
      0,
      JSON.stringify(structure.infobox),
      Date.now(),
    );
    const id = crypto.randomUUID();
    queries.insertInfographicForSection.run(
      id,
      wikiUrl,
      pageId,
      sectionId,
      "infobox",
      Date.now(),
      batchId,
    );
    const isPlace =
      categoryKey === "place" ||
      (categoryKey && CATEGORY_BY_KEY[categoryKey]?.parent === "place");
    const prompt = buildInfoboxPrompt({
      pageTitle: summary.title,
      pageDescription: summary.description,
      infobox: structure.infobox,
      isPlace: !!isPlace,
    });
    console.log(`gen ${id} INFOBOX page="${summary.title}" isPlace=${!!isPlace}`);
    generateOne(id, prompt, {
      lang,
      title: `${summary.title} — Infobox`,
      description: summary.description,
      extract: structure.infobox.map((p) => `${p.key}: ${p.value}`).join("\n"),
      categoryKey,
      size: "640x1536",
    }).catch((e) => console.warn("infobox gen failed", e));
  }

  // Section infographics (H2 + H3)
  for (const sec of structure.sections) {
    const sectionId = crypto.randomUUID();
    queries.insertWikiSection.run(
      sectionId,
      pageId,
      idx++,
      "section",
      sec.title,
      sec.level,
      sec.text,
      Date.now(),
    );
    const id = crypto.randomUUID();
    queries.insertInfographicForSection.run(
      id,
      wikiUrl,
      pageId,
      sectionId,
      "section",
      Date.now(),
      batchId,
    );
    const prompt = buildSectionPrompt({
      pageTitle: summary.title,
      pageDescription: summary.description,
      sectionTitle: sec.title,
      sectionLevel: sec.level,
      sectionText: sec.text,
      style,
    });
    console.log(
      `gen ${id} SECTION "${sec.title}" (h${sec.level}) page="${summary.title}"`,
    );
    generateOne(id, prompt, {
      lang,
      title: `${summary.title} — ${sec.title}`,
      description: summary.description,
      extract: sec.text,
      categoryKey,
    }).catch((e) => console.warn("section gen failed", e));

    // Tiny black-on-white pictogram for the section header.
    if (process.env.GENERATE_SECTION_ICONS !== "false") {
      const iconId = crypto.randomUUID();
      queries.insertInfographicForSection.run(
        iconId,
        wikiUrl,
        pageId,
        sectionId,
        "section_icon",
        Date.now(),
        batchId,
      );
      const iconPrompt = `A single minimal pictogram representing the concept of "${sec.title}". Solid black silhouette or symbol centered on a pure white background. Public-signage glyph clarity, like an Olympic pictogram or museum wayfinding icon. No text, no labels, no border, no decorative elements. Strong negative space and generous white margins. Single shape only.`;
      generateOne(iconId, iconPrompt, {
        lang,
        title: `${summary.title} — ${sec.title} icon`,
        description: "",
        extract: sec.title,
        categoryKey: null,
        size: "1024x1024",
      }).catch((e) => console.warn("section icon gen failed", e));
    }
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
        const body = (await req.json()) as { url: string; category?: string | null };
        const { canonical } = parseWikipediaUrl(body.url);
        const id = crypto.randomUUID();
        // The overview's id IS the batch id — every fan-out child shares it.
        queries.insertInfographic.run(id, canonical, Date.now(), id);
        processInBackground(id, canonical, body.category ?? null);
        const row = queries.getById.get(id);
        return Response.json({ infographic: row ? viewInfographic(row) : null });
      } catch (err) {
        return jsonError(err);
      }
    }

    if (req.method === "GET" && path === "/page-structure") {
      try {
        const wikiUrl = url.searchParams.get("url");
        if (!wikiUrl) return jsonError(new Error("missing url"));
        const { canonical } = parseWikipediaUrl(wikiUrl);
        const page = queries.getWikiPageByUrl.get(canonical);
        const allInfo = queries.getInfographicsByUrl.all(canonical);
        const bySection = new Map<string | null, InfographicView[]>();
        bySection.set(null, []);
        for (const i of allInfo) {
          const sid = i.section_id ?? null;
          if (!bySection.has(sid)) bySection.set(sid, []);
          bySection.get(sid)!.push(viewInfographic(i));
        }
        let sections: Array<any> = [];
        if (page) {
          const secs = queries.getSectionsByPage.all(page.id);
          sections = secs.map((s) => ({
            id: s.id,
            kind: s.kind,
            title: s.title,
            level: s.level,
            section_index: s.section_index,
            text_body: s.text_body,
            infographics: bySection.get(s.id) ?? [],
          }));
        }
        return Response.json({
          page: page
            ? {
                id: page.id,
                wiki_url: page.wiki_url,
                wiki_title: page.wiki_title,
                wiki_lang: page.wiki_lang,
                wiki_description: page.wiki_description,
                wiki_extract: page.wiki_extract,
                infobox: page.infobox_json
                  ? (JSON.parse(page.infobox_json) as Array<{ key: string; value: string }>)
                  : null,
              }
            : null,
          overview_infographics: bySection.get(null) ?? [],
          sections,
        });
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

    if (req.method === "GET" && path === "/categories") {
      return Response.json({
        categories: CATEGORIES.map((c) => ({
          key: c.key,
          label: c.label,
          icon: c.icon,
          parent: c.parent ?? null,
          color: getCategoryColor(c.key) ?? null,
        })),
      });
    }

    if (req.method === "GET" && path === "/graph") {
      try {
        const rows = queries.galleryDone.all(2000);
        const nodes = rows.map(viewInfographic);
        const idByUrl = new Map<string, string>();
        const urlByTitle = new Map<string, string>();
        for (const r of rows) {
          idByUrl.set(r.wiki_url, r.id);
          if (r.wiki_title) urlByTitle.set(r.wiki_title, r.wiki_url);
        }
        let links: Array<{ source: string; target: string }> = [];
        if (existsSync("data/edges.json")) {
          const raw = (await Bun.file("data/edges.json").json()) as Array<{
            source: string;
            target: string;
          }>;
          const seen = new Set<string>();
          for (const e of raw) {
            const su = urlByTitle.get(e.source);
            const tu = urlByTitle.get(e.target);
            if (!su || !tu || su === tu) continue;
            const sid = idByUrl.get(su)!;
            const tid = idByUrl.get(tu)!;
            const key = sid < tid ? `${sid}|${tid}` : `${tid}|${sid}`;
            if (seen.has(key)) continue;
            seen.add(key);
            links.push({ source: sid, target: tid });
          }
        }
        return Response.json({ nodes, links });
      } catch (err) {
        return jsonError(err);
      }
    }

    if (req.method === "GET" && path === "/gallery") {
      try {
        const rows = queries.galleryDone.all(500);
        const results: InfographicView[] = rows.map((r) => ({
          ...viewInfographic(r),
          view_count: (r as any).view_count ?? 0,
        }));
        return Response.json({ results });
      } catch (err) {
        return jsonError(err);
      }
    }

    if (req.method === "POST" && path === "/view") {
      try {
        const body = (await req.json()) as { url: string };
        const { canonical } = parseWikipediaUrl(body.url);
        queries.incrementView.run(canonical, canonical, Date.now());
        return Response.json({ ok: true });
      } catch (err) {
        return jsonError(err);
      }
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`wikigraphica listening on http://localhost:${server.port}`);
