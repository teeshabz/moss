import type { RawPostResult, PostWithRelations } from '@/lib/types'

/**
 * Map raw Supabase post result (with user/media_item as array from join) to PostWithRelations
 */
export function mapRawPostToPostWithRelations(
  raw: RawPostResult,
  smiledByCurrentUser = false
): PostWithRelations {
  return {
    id: raw.id,
    user_id: raw.user_id,
    media_item_id: raw.media_item_id,
    note: raw.note,
    created_at: raw.created_at,
    user: Array.isArray(raw.user) ? raw.user[0] : raw.user,
    media_item: Array.isArray(raw.media_item) ? raw.media_item[0] : raw.media_item,
    smiledByCurrentUser,
  }
}
