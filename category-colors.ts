// Color assignment for gallery category chips.

const PALETTE = ['#7c9885', '#a37c5b', '#5b7ca3', '#a35b7c', '#85a35b', '#5ba398']

// Stable color for a category name: same name always maps to the same palette
// entry so chips don't change color between renders.
export function categoryColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i)
  }
  return PALETTE[hash % PALETTE.length]
}

// Readable text color for a given chip background.
export function chipTextColor(background: string): string {
  const r = parseInt(background.slice(1, 3), 16)
  const g = parseInt(background.slice(3, 5), 16)
  const b = parseInt(background.slice(5, 7), 16)
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  return luminance > 128 ? '#1a1a1a' : '#ffffff'
}
