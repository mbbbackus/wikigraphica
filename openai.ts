const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set");
  process.exit(1);
}

export const IMAGE_MODEL = process.env.IMAGE_MODEL ?? "gpt-image-2";
export const IMAGE_SIZE = process.env.IMAGE_SIZE ?? "1024x1024";
export const IMAGE_QUALITY = process.env.IMAGE_QUALITY ?? "low";

export async function generateImage(
  prompt: string,
  opts?: { size?: string; quality?: string },
): Promise<Buffer> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      size: opts?.size ?? IMAGE_SIZE,
      quality: opts?.quality ?? IMAGE_QUALITY,
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
