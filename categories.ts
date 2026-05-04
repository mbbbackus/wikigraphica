export type CategoryKey =
  | "person"
  | "place"
  | "event"
  | "science"
  | "technology"
  | "nature"
  | "culture"
  | "sports"
  | "food"
  | "math"
  | "religion"
  | "medicine"
  | "transport"
  | "astronomy"
  | "architecture"
  | "company";

export type Category = {
  key: CategoryKey;
  label: string;
  hint: string;
  style: string;
  icon: string; // Phosphor icon name (used as `ph ph-<icon>`)
};

export const CATEGORIES: Category[] = [
  {
    key: "person",
    label: "Person",
    hint: "A biography of a real or fictional individual: authors, scientists, leaders, athletes, artists.",
    style:
      "Portrait-led layout: central illustrated portrait of the subject, side panel with birth/death dates and key accomplishments, era-appropriate color palette and typography (period-toned for historical figures, modern for contemporary).",
    icon: "user-circle",
  },
  {
    key: "place",
    label: "Place",
    hint: "A geographic location: country, city, town, region, mountain, river, natural landmark.",
    style:
      "Map-led layout: stylized map or aerial view of the region as anchor, location pins for major landmarks, demographic stats as data callouts, regional/climate-derived color palette.",
    icon: "map-pin",
  },
  {
    key: "event",
    label: "Event",
    hint: "A historical event, war, treaty, election, disaster, movement, or era.",
    style:
      "Timeline-led layout: horizontal timeline as the backbone, event nodes with dates and brief captions, period-evocative muted palette (sepia for older eras, fuller color for modern).",
    icon: "clock-clockwise",
  },
  {
    key: "science",
    label: "Science",
    hint: "A scientific concept, principle, law, particle, chemical, phenomenon, or theory in physics, chemistry, or biology.",
    style:
      "Diagram-led layout: schematic illustration of the concept with clearly labeled parts, formulas or equations rendered cleanly, technical educational palette (blues and whites with one warm accent).",
    icon: "flask",
  },
  {
    key: "technology",
    label: "Technology",
    hint: "A technology, machine, device, software product, programming language, network protocol, or engineered system.",
    style:
      "Schematic-led layout: exploded or layered diagram of components with technical labels, modern industrial palette (graphite, white) with a single neon accent, geometric grid composition.",
    icon: "cpu",
  },
  {
    key: "nature",
    label: "Nature",
    hint: "An animal, plant, fungus, microorganism, or other biological species or taxon.",
    style:
      "Naturalist illustration: realistic central drawing of the species with anatomical labels, a small habitat-range map, watercolor naturalist palette (greens, browns with one vibrant accent).",
    icon: "leaf",
  },
  {
    key: "culture",
    label: "Arts & culture",
    hint: "A film, book, novel, video game, painting, artistic movement, TV series, or other cultural work (excluding music).",
    style:
      "Editorial layout: representative cover or reference imagery treated boldly, a grid of key works or facts, expressive color palette tuned to the medium and era of the work.",
    icon: "palette",
  },
  {
    key: "sports",
    label: "Sports",
    hint: "A sport, team, athlete, tournament, league, or sporting event.",
    style:
      "Pitch-led layout: court or field diagram as a base, dynamic action pose of an athlete, large stat numerals, team-colored accents and kinetic sans-serif typography.",
    icon: "soccer-ball",
  },
  {
    key: "food",
    label: "Food",
    hint: "A dish, ingredient, beverage, cuisine, or food-related concept.",
    style:
      "Recipe-card aesthetic: top-down hero illustration of the dish, ingredient circles with labels, warm palette (cream, terracotta, herb green), hand-drawn iconography.",
    icon: "fork-knife",
  },
  {
    key: "math",
    label: "Math",
    hint: "A mathematical concept, theorem, equation, branch of math, or famous problem.",
    style:
      "Formula-led layout: equation typography as the centerpiece, geometric shapes for visual rhythm, minimalist monochrome with a single accent color, textbook-clean composition.",
    icon: "function",
  },
  {
    key: "religion",
    label: "Religion",
    hint: "A religion, religious figure, scripture, theological concept, denomination, ritual, or sacred place.",
    style:
      "Sacred-art treatment: single emblematic symbol, artifact, or icon as the anchor; illuminated-manuscript ornamentation around the borders; gold and jewel-tone accents; calligraphic display title.",
    icon: "cross",
  },
  {
    key: "medicine",
    label: "Medicine",
    hint: "A disease, body part, organ, medical condition, treatment, drug, surgery, or anatomical structure.",
    style:
      "Anatomical illustration: cross-section or labeled diagram of the subject, clinical white background with red and deep-blue accents, technical leader-line labels, didactic textbook layout.",
    icon: "stethoscope",
  },
  {
    key: "transport",
    label: "Transport",
    hint: "A vehicle (car, plane, ship, train, bicycle, spacecraft) or transportation system.",
    style:
      "Cutaway/side-elevation diagram: technical side or three-quarter view of the vehicle with dimension callouts, light blueprint-grid background, modern transport-magazine feel.",
    icon: "car",
  },
  {
    key: "astronomy",
    label: "Astronomy",
    hint: "A celestial object (planet, moon, star, galaxy, comet, nebula), astronomical phenomenon, or space mission.",
    style:
      "Starfield-led: dark cosmic background with the celestial subject as a luminous focal point, scale-comparison overlay against a familiar reference, orbital or dimensional callouts, deep blues with one bright accent.",
    icon: "planet",
  },
  {
    key: "architecture",
    label: "Architecture",
    hint: "A notable building, monument, bridge, infrastructure project, or architectural style.",
    style:
      "Architectural elevation: front or three-quarter rendered elevation with blueprint-style technical lines and dimensions, neutral palette with one strong accent, draftsman's lettering.",
    icon: "buildings",
  },
  {
    key: "company",
    label: "Company",
    hint: "A company, corporation, brand, organization, or institution.",
    style:
      "Corporate report aesthetic: bold founding-date numeral, milestone timeline strip, clean grid with key-stat callouts (employees, revenue, founders), neutral grayscale with a single brand-colored accent.",
    icon: "briefcase",
  },
];

export const CATEGORY_BY_KEY: Record<CategoryKey, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c]),
) as Record<CategoryKey, Category>;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const CLASSIFIER_MODEL = process.env.CLASSIFIER_MODEL ?? "gpt-4o-mini";

const SYSTEM_PROMPT = `You classify Wikipedia articles into exactly one category from this list:

${CATEGORIES.map((c) => `- ${c.key}: ${c.hint}`).join("\n")}

Return strictly JSON: {"category": "<key>"} where <key> is one of: ${CATEGORIES.map((c) => c.key).join(", ")}, or "none" if no category clearly fits.`;

export async function classify(input: {
  title: string;
  description?: string;
  extract: string;
}): Promise<CategoryKey | null> {
  const userMsg = [
    `Title: ${input.title}`,
    input.description ? `Short description: ${input.description}` : "",
    `Extract: ${input.extract.slice(0, 1200)}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: CLASSIFIER_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    });
    if (!res.ok) {
      console.warn("classifier non-200:", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { category?: string };
    const key = parsed.category;
    if (!key || key === "none") return null;
    return CATEGORY_BY_KEY[key as CategoryKey] ? (key as CategoryKey) : null;
  } catch (err) {
    console.warn("classifier error:", err);
    return null;
  }
}
