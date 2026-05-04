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
