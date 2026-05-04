import { file } from "bun";

const PORT = Number(process.env.PORT ?? 3000);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set");
  process.exit(1);
}

type WikiSummary = {
  title: string;
  description?: string;
  extract: string;
};

function parseWikipediaUrl(input: string): { lang: string; title: string } {
  const url = new URL(input);
  if (!/wikipedia\.org$/.test(url.hostname)) {
    throw new Error("Not a wikipedia.org URL");
  }
  const lang = url.hostname.split(".")[0] || "en";
  const m = url.pathname.match(/^\/wiki\/(.+)$/);
  if (!m) throw new Error("URL must point to /wiki/<title>");
  const title = decodeURIComponent(m[1]).replace(/_/g, " ");
  return { lang, title };
}

async function fetchWikiSummary(lang: string, title: string): Promise<WikiSummary> {
  const encoded = encodeURIComponent(title.replace(/ /g, "_"));
  const res = await fetch(
    `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
    { headers: { "User-Agent": "wikigraphica/0.1 (local dev)" } },
  );
  if (!res.ok) throw new Error(`Wikipedia summary fetch failed: ${res.status}`);
  const data = (await res.json()) as WikiSummary;
  return data;
}

function buildPrompt(s: WikiSummary): string {
  return [
    `Create a single-page infographic about "${s.title}".`,
    s.description ? `Subject type: ${s.description}.` : "",
    `Summary to visualize:\n${s.extract}`,
    `Style: clean, modern editorial infographic. Use a clear visual hierarchy with a bold title, sub-sections with short labels, simple icons or illustrations, and 2-4 short factual callouts pulled from the summary. Use a tasteful limited color palette and a light background. Include readable text. Do not include any logos, watermarks, or fictional sources.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function generateInfographic(prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-image-2",
      prompt,
      size: "1024x1536",
      quality: "high",
      n: 1,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${text}`);
  }
  const data = (await res.json()) as { data: Array<{ b64_json: string }> };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned");
  return b64;
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/") {
      return new Response(file("public/index.html"));
    }

    if (req.method === "POST" && url.pathname === "/generate") {
      try {
        const { url: wikiUrl } = (await req.json()) as { url: string };
        const { lang, title } = parseWikipediaUrl(wikiUrl);
        const summary = await fetchWikiSummary(lang, title);
        const prompt = buildPrompt(summary);
        const b64 = await generateInfographic(prompt);
        return Response.json({
          title: summary.title,
          description: summary.description,
          imageBase64: b64,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("/generate failed:", msg);
        return Response.json({ error: msg }, { status: 400 });
      }
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`wikigraphica listening on http://localhost:${server.port}`);
