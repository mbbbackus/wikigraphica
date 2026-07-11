import * as cheerio from "cheerio";

export type InfoboxPair = { key: string; value: string };
export type PageSection = { title: string; level: number; text: string };
export type PageStructure = {
  infobox: InfoboxPair[] | null;
  sections: PageSection[];
};

const SKIP_SECTION_TITLES = new Set([
  "References",
  "External links",
  "See also",
  "Notes",
  "Bibliography",
  "Further reading",
  "Citations",
  "Footnotes",
  "Sources",
  "Gallery",
]);

const MIN_SECTION_TEXT_LEN = 120;
const MAX_SECTION_TEXT_LEN = 4000;

export async function fetchPageStructure(
  lang: string,
  title: string,
): Promise<PageStructure> {
  const slug = encodeURIComponent(title.replace(/ /g, "_"));
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/html/${slug}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "wikigraphica/0.1 (structure)" },
  });
  if (!res.ok) throw new Error(`page html fetch ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  // --- Infobox ---
  let infobox: InfoboxPair[] | null = null;
  const $box = $("table.infobox").first();
  if ($box.length) {
    const pairs: InfoboxPair[] = [];
    $box.find("tr").each((_, tr) => {
      const $th = $(tr).find("th").first();
      const $td = $(tr).find("td").first();
      if (!$th.length || !$td.length) return;
      const key = $th.text().trim().replace(/\s+/g, " ");
      const value = $td.text().trim().replace(/\s+/g, " ").slice(0, 240);
      if (!key || !value || key.length > 80) return;
      pairs.push({ key, value });
    });
    if (pairs.length) infobox = pairs;
  }
  // Fallback: "Part of a series on …" sidebars + vertical navboxes.
  if (!infobox) {
    const $alt = $(
      "table.sidebar, aside.sidebar, table.vertical-navbox, table[class*='sidebar'], aside[class*='sidebar']",
    ).first();
    if ($alt.length) {
      const pairs: InfoboxPair[] = [];
      const preTitle = $alt
        .find(".sidebar-pretitle, .sidebar-pretitle-with-top-image, .sidebar-above")
        .first()
        .text()
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 80);
      const title = $alt
        .find(".sidebar-title, .sidebar-title-with-pretitle, .sidebar-heading")
        .first()
        .text()
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 120);
      if (title) {
        pairs.push({
          key: preTitle && /series|part of/i.test(preTitle) ? "Series" : preTitle || "Title",
          value: title,
        });
      }
      // Pull a deduped list of nav links inside the sidebar (limited to ~24).
      const items: string[] = [];
      $alt.find("a").each((_, a) => {
        const t = $(a).text().trim().replace(/\s+/g, " ");
        if (!t || t.length < 2 || t.length > 60) return;
        if (/^\[edit\]$/i.test(t) || /^\[\d+\]$/.test(t)) return;
        if (items.includes(t)) return;
        if (t.toLowerCase() === title.toLowerCase()) return;
        items.push(t);
      });
      const PER_ROW = 6;
      for (let i = 0; i < items.length && i < 24; i += PER_ROW) {
        const chunk = items.slice(i, i + PER_ROW).join(" · ");
        pairs.push({
          key: i === 0 ? "Topics" : "More",
          value: chunk.slice(0, 240),
        });
      }
      if (pairs.length) infobox = pairs;
    }
  }

  // --- Sections (H2 + H3) ---
  const sections: PageSection[] = [];
  $("h2, h3").each((_, el) => {
    const $h = $(el);
    const tag = (el as any).tagName?.toLowerCase?.() ?? "h2";
    const level = tag === "h3" ? 3 : 2;
    let title = $h.find(".mw-headline").text().trim();
    if (!title) title = $h.text().trim();
    title = title.replace(/\[edit\]/g, "").trim();
    if (!title) return;
    if (SKIP_SECTION_TITLES.has(title)) return;

    const parts: string[] = [];
    let next = $h.next();
    while (next.length) {
      const tn = (next[0] as any).tagName?.toLowerCase?.() ?? "";
      if (tn === "h1" || tn === "h2" || tn === "h3") break;
      const t = next.text().trim();
      if (t) parts.push(t.replace(/\s+/g, " "));
      next = next.next();
    }
    const text = parts.join("\n").slice(0, MAX_SECTION_TEXT_LEN);
    if (text.length < MIN_SECTION_TEXT_LEN) return;
    sections.push({ title, level, text });
  });

  return { infobox, sections };
}
