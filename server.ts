import { file } from "bun";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const PORT = Number(process.env.PORT ?? 3939);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "infographics";
const IMAGE_QUALITY = process.env.IMAGE_QUALITY ?? "medium";
const IMAGE_SIZE = process.env.IMAGE_SIZE ?? "1024x1536";
const IMAGE_MODEL = process.env.IMAGE_MODEL ?? "gpt-image-2";

if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set");
  process.exit(1);
}

let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  await ensureBucket(supabase);
} else {
  console.warn(
    "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — running without persistence (dev only).",
  );
}

async function ensureBucket(client: SupabaseClient) {
  const { data, error } = await client.storage.getBucket(BUCKET);
  if (data) return;
  if (error && !/not found|does not exist/i.test(error.message)) {
    console.warn("getBucket error:", error.message);
  }
  const { error: createErr } = await client.storage.createBucket(BUCKET, {
    public: true,
  });
  if (createErr && !/already exists/i.test(createErr.message)) {
    console.error("createBucket failed:", createErr.message);
  } else {
    console.log(`Created public storage bucket: ${BUCKET}`);
  }
}

type WikiSummary = {
  title: string;
  description?: string;
  extract: string;
};

type InfographicRow = {
  id: string;
  wiki_url: string;
  wiki_title: string;
  wiki_lang: string;
  wiki_description: string | null;
  wiki_extract: string | null;
  image_path: string;
  prompt: string;
  model: string;
  quality: string | null;
  size: string | null;
  created_at: string;
};

type InfographicResponse = InfographicRow & { image_url: string };

function looksLikeWikipediaUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return /(^|\.)wikipedia\.org$/.test(u.hostname) && /^\/wiki\/.+/.test(u.pathname);
  } catch {
    return false;
  }
}

function parseWikipediaUrl(input: string): { lang: string; title: string; canonical: string } {
  const url = new URL(input);
  if (!/wikipedia\.org$/.test(url.hostname)) {
    throw new Error("Not a wikipedia.org URL");
  }
  const lang = url.hostname.split(".")[0] || "en";
  const m = url.pathname.match(/^\/wiki\/(.+)$/);
  if (!m) throw new Error("URL must point to /wiki/<title>");
  const slug = m[1].split("#")[0];
  const title = decodeURIComponent(slug).replace(/_/g, " ");
  const canonical = `https://${lang}.wikipedia.org/wiki/${slug}`;
  return { lang, title, canonical };
}

async function fetchWikiSummary(lang: string, title: string): Promise<WikiSummary> {
  const encoded = encodeURIComponent(title.replace(/ /g, "_"));
  const res = await fetch(
    `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
    { headers: { "User-Agent": "wikigraphica/0.1 (local dev)" } },
  );
  if (!res.ok) throw new Error(`Wikipedia summary fetch failed: ${res.status}`);
  return (await res.json()) as WikiSummary;
}

function buildPrompt(s: WikiSummary): string {
  return [
    `Create a single-page infographic about "${s.title}".`,
    s.description ? `Subject type: ${s.description}.` : "",
    `Summary to visualize:\n${s.extract}`,
    `Style: clean, modern editorial infographic. Clear visual hierarchy with a bold title, sub-sections with short labels, simple icons or illustrations, and 2-4 short factual callouts pulled from the summary. Tasteful limited color palette, light background, readable text. No logos, watermarks, or fictional sources.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function generateImage(prompt: string): Promise<Buffer> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      size: IMAGE_SIZE,
      quality: IMAGE_QUALITY,
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
  return Buffer.from(b64, "base64");
}

function publicImageUrl(imagePath: string): string {
  if (!supabase) return "";
  return supabase.storage.from(BUCKET).getPublicUrl(imagePath).data.publicUrl;
}

function withImageUrl(row: InfographicRow): InfographicResponse {
  return { ...row, image_url: publicImageUrl(row.image_path) };
}

async function findByUrl(canonicalUrl: string): Promise<InfographicResponse[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("infographics")
    .select("*")
    .eq("wiki_url", canonicalUrl)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(withImageUrl);
}

async function search(q: string, limit = 50): Promise<InfographicResponse[]> {
  if (!supabase) return [];
  const trimmed = q.trim();
  if (!trimmed) return [];
  if (looksLikeWikipediaUrl(trimmed)) {
    const { canonical } = parseWikipediaUrl(trimmed);
    return findByUrl(canonical);
  }
  const ilike = `%${trimmed}%`;
  const { data, error } = await supabase
    .from("infographics")
    .select("*")
    .or(`wiki_title.ilike.${ilike},wiki_extract.ilike.${ilike}`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(withImageUrl);
}

async function gallery(limit = 60): Promise<InfographicResponse[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("infographics")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(withImageUrl);
}

async function generateAndStore(wikiUrl: string): Promise<InfographicResponse> {
  const { lang, title, canonical } = parseWikipediaUrl(wikiUrl);
  const summary = await fetchWikiSummary(lang, title);
  const prompt = buildPrompt(summary);
  const buffer = await generateImage(prompt);

  if (!supabase) {
    return {
      id: crypto.randomUUID(),
      wiki_url: canonical,
      wiki_title: summary.title,
      wiki_lang: lang,
      wiki_description: summary.description ?? null,
      wiki_extract: summary.extract ?? null,
      image_path: "",
      prompt,
      model: IMAGE_MODEL,
      quality: IMAGE_QUALITY,
      size: IMAGE_SIZE,
      created_at: new Date().toISOString(),
      image_url: "data:image/png;base64," + buffer.toString("base64"),
    };
  }

  const id = crypto.randomUUID();
  const imagePath = `${id}.png`;
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(imagePath, buffer, { contentType: "image/png", upsert: false });
  if (uploadErr) throw new Error(`storage upload: ${uploadErr.message}`);

  const row: Omit<InfographicRow, "created_at"> = {
    id,
    wiki_url: canonical,
    wiki_title: summary.title,
    wiki_lang: lang,
    wiki_description: summary.description ?? null,
    wiki_extract: summary.extract ?? null,
    image_path: imagePath,
    prompt,
    model: IMAGE_MODEL,
    quality: IMAGE_QUALITY,
    size: IMAGE_SIZE,
  };
  const { data, error } = await supabase
    .from("infographics")
    .insert(row)
    .select("*")
    .single();
  if (error) throw new Error(`db insert: ${error.message}`);
  return withImageUrl(data as InfographicRow);
}

function jsonError(err: unknown, status = 400) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("error:", msg);
  return Response.json({ error: msg }, { status });
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
        const result = await generateAndStore(wikiUrl);
        return Response.json(result);
      } catch (err) {
        return jsonError(err);
      }
    }

    if (req.method === "GET" && url.pathname === "/by-url") {
      try {
        const wikiUrl = url.searchParams.get("url");
        if (!wikiUrl) return jsonError(new Error("missing url"));
        const { canonical } = parseWikipediaUrl(wikiUrl);
        const results = await findByUrl(canonical);
        return Response.json({ results });
      } catch (err) {
        return jsonError(err);
      }
    }

    if (req.method === "GET" && url.pathname === "/search") {
      try {
        const q = url.searchParams.get("q") ?? "";
        const results = await search(q);
        return Response.json({ results });
      } catch (err) {
        return jsonError(err);
      }
    }

    if (req.method === "GET" && url.pathname === "/gallery") {
      try {
        const results = await gallery();
        return Response.json({ results });
      } catch (err) {
        return jsonError(err);
      }
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`wikigraphica listening on http://localhost:${server.port}`);
