// Tag parsing and normalization for gallery infographics.
//
// Tags are stored as a comma-separated string on the infographics row and
// entered by users as free text ("history, Maps,ancient-rome").

export const MAX_TAGS_PER_ITEM = 8;
export const MAX_TAG_LENGTH = 32;

// Canonical form: lowercase, trimmed, inner whitespace collapsed to dashes.
export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-").slice(0, MAX_TAG_LENGTH);
}

// Parse a user-entered tag string into canonical tags.
export function parseTags(input: string): string[] {
  return input.split(",").map(normalizeTag).slice(0, MAX_TAGS_PER_ITEM);
}

// Serialize for storage.
export function serializeTags(tags: string[]): string {
  return tags.join(",");
}

// Does a stored tag string contain the given (already-normalized) tag?
export function hasTag(stored: string | null, tag: string): boolean {
  if (!stored) return false;
  return stored.split(",").includes(tag);
}
