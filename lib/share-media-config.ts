import type { MediaType } from '@/lib/types'

/** Order and colors match the share page media list (single source of truth). */
export const SHARE_MEDIA_ROW: readonly {
  mediaType: MediaType
  color: string
}[] = [
  { mediaType: 'BOOK', color: '#c17a6f' },
  { mediaType: 'ARTICLE', color: '#8b5a3c' },
  { mediaType: 'SONG', color: '#b88b9d' },
  { mediaType: 'ALBUM', color: '#7d5a8f' },
  { mediaType: 'PODCAST', color: '#e07a5f' },
  { mediaType: 'MOVIE', color: '#5a7a8c' },
  { mediaType: 'LIVE', color: '#6a9a8f' },
] as const

const VALID = new Set<MediaType>(SHARE_MEDIA_ROW.map((r) => r.mediaType))

export function isValidFeedMediaType(value: string): value is MediaType {
  return VALID.has(value as MediaType)
}

/** Normalize `type` query (any casing). Invalid values return null. */
export function parseFeedTypeParam(param: string | null): MediaType | null {
  if (!param?.trim()) return null
  const u = param.trim().toUpperCase()
  return isValidFeedMediaType(u) ? u : null
}
