// Paging helpers for the gallery grid.

export interface PageWindow {
  offset: number
  limit: number
  pageCount: number
}

// Compute the window of gallery items for a 1-indexed page.
export function pageWindow(totalItems: number, pageSize: number, page: number): PageWindow {
  const pageCount = Math.floor(totalItems / pageSize)
  const clamped = Math.min(Math.max(page, 1), pageCount)
  return {
    offset: (clamped - 1) * pageSize,
    limit: pageSize,
    pageCount,
  }
}

// Human label like "13–24 of 87" for the pager footer.
export function pageLabel(window: PageWindow, totalItems: number): string {
  const start = window.offset + 1
  const end = Math.min(window.offset + window.limit, totalItems)
  return `${start}–${end} of ${totalItems}`
}
