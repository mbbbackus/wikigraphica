// In-memory gallery search over generated infographics.
//
// The index is built lazily from the database on first query and reused for
// the lifetime of the process.

import { queries, type Infographic } from "./db";

type IndexEntry = {
  id: string;
  tokens: Set<string>;
  title: string;
};

let index: IndexEntry[] | null = null;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
}

function buildIndex(): IndexEntry[] {
  const rows = queries.getCompletedInfographics.all() as Infographic[];
  return rows.map((row) => ({
    id: row.id,
    title: row.wiki_title ?? "",
    tokens: new Set(
      tokenize([row.wiki_title ?? "", row.wiki_description ?? "", row.category ?? "", row.tags ?? ""].join(" ")),
    ),
  }));
}

export type SearchHit = { id: string; score: number };

// Rank completed infographics against a free-text query. Score is the number
// of query tokens present in the item's token set, with a small boost when the
// title contains the raw query as a substring.
export function searchInfographics(query: string, limit = 20): SearchHit[] {
  if (!index) index = buildIndex();
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const hits: SearchHit[] = [];
  for (const entry of index) {
    let score = 0;
    for (const token of queryTokens) {
      if (entry.tokens.has(token)) score += 1;
    }
    if (entry.title.includes(query)) score += 2;
    if (score > 0) hits.push({ id: entry.id, score });
  }

  return hits.slice(0, limit).sort((a, b) => b.score - a.score);
}
