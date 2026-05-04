export type WikiSummary = {
  title: string;
  description?: string;
  extract: string;
};

export function looksLikeWikipediaUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return /(^|\.)wikipedia\.org$/.test(u.hostname) && /^\/wiki\/.+/.test(u.pathname);
  } catch {
    return false;
  }
}

export function parseWikipediaUrl(input: string): {
  lang: string;
  title: string;
  canonical: string;
} {
  const url = new URL(input);
  if (!/wikipedia\.org$/.test(url.hostname)) {
    throw new Error("URL must be a Wikipedia article.");
  }
  const lang = url.hostname.split(".")[0] || "en";
  const m = url.pathname.match(/^\/wiki\/(.+)$/);
  if (!m) throw new Error("URL must point to a /wiki/ article.");
  const slug = m[1].split("#")[0].split("?")[0];
  const title = decodeURIComponent(slug).replace(/_/g, " ");
  const canonical = `https://${lang}.wikipedia.org/wiki/${slug}`;
  return { lang, title, canonical };
}

export async function fetchWikiSummary(lang: string, title: string): Promise<WikiSummary> {
  const encoded = encodeURIComponent(title.replace(/ /g, "_"));
  const res = await fetch(
    `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
    { headers: { "User-Agent": "wikigraphica/0.1 (local dev)" } },
  );
  if (!res.ok) throw new Error(`Wikipedia summary fetch failed: ${res.status}`);
  return (await res.json()) as WikiSummary;
}

const DEFAULT_STYLE =
  "Clean, modern editorial infographic. Bold title, sub-sections with short labels, simple icons or illustrations, 2-4 short factual callouts pulled directly from the summary above. Tasteful limited color palette, light background, readable text.";

export function buildPrompt(s: WikiSummary, style?: string): string {
  return [
    `Create a single-page infographic about "${s.title}".`,
    s.description ? `Subject: ${s.description}.` : "",
    `Use only the following Wikipedia content as the source of facts. Do not invent additional facts.\n\n${s.extract}`,
    `Style: ${style ?? DEFAULT_STYLE} No logos, watermarks, or fictional sources.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildSectionPrompt(args: {
  pageTitle: string;
  pageDescription?: string;
  sectionTitle: string;
  sectionLevel: number;
  sectionText: string;
  style?: string;
}): string {
  const { pageTitle, pageDescription, sectionTitle, sectionText, style } = args;
  return [
    `Create a single-page infographic visualizing the section "${sectionTitle}" of the Wikipedia article "${pageTitle}".`,
    pageDescription ? `Page subject: ${pageDescription}.` : "",
    `Make the section title "${sectionTitle}" the dominant heading of the infographic, not the page title.`,
    `Use only the following section content as facts. Do not invent additional facts.\n\n${sectionText}`,
    `Style: ${style ?? DEFAULT_STYLE} No logos, watermarks, or fictional sources.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildInfoboxPrompt(args: {
  pageTitle: string;
  pageDescription?: string;
  infobox: Array<{ key: string; value: string }>;
  isPlace?: boolean;
}): string {
  const { pageTitle, pageDescription, infobox, isPlace } = args;
  const lines = infobox
    .slice(0, 16)
    .map((p) => `- ${p.key}: ${p.value}`)
    .join("\n");
  return [
    `Create a strictly text-and-data vertical sidebar panel for "${pageTitle}". This is a key-facts column — like a Wikipedia infobox or a museum object label. The composition is long and narrow (single tall column).`,
    pageDescription ? `Subject: ${pageDescription}.` : "",
    `ABSOLUTE RULES: no portraits, no faces, no people, no photographs, no scenes, no illustrations of the subject, no decorative imagery, no equations, no diagrams.${isPlace ? " The ONLY exception is a small simple location pin or country/region outline glyph at the very top — no detailed map, no photographs." : " No imagery at all."}`,
    `Layout: bold all-caps title at top in heavy sans-serif. Thin black rule beneath. Then a vertical stack of label/value pairs running top-to-bottom: each row is the label in small caps muted gray on the left, value in larger black on the right. Subtle thin dividers between rows. Generous vertical breathing room. Plate number or "KEY FACTS" eyebrow above the title in small caps.`,
    `Palette: warm cream paper #F4ECD8, deep ink #14171F, single muted accent #283B59. No other colors. No backgrounds beyond the cream.`,
    `Facts to include verbatim, in this order:\n${lines}`,
    `Render only the typographic panel described. No watermarks, no logos, no fictional sources, no signatures.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
