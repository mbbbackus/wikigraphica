// Shared text normalization for Wikipedia titles and scraped content.
//
// Title/slug conversion and whitespace cleanup used to live inline at each
// call site (wiki.ts, wiki-structure.ts); this module owns the rules so the
// encode/decode pair can't drift apart.

// "Battle of Hastings" -> "Battle_of_Hastings", URL-encoded for REST paths.
export function titleToSlug(title: string): string {
  return encodeURIComponent(title.replace(/ /g, "_"));
}

// "Battle_of_Hastings" (possibly percent-encoded) -> "Battle of Hastings".
export function slugToTitle(slug: string): string {
  return decodeURIComponent(slug).replace(/_/g, " ");
}

// Trim and collapse internal whitespace runs to single spaces.
export function collapseWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}
