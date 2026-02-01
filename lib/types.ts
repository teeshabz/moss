/**
 * Shared TypeScript types for Moss API
 */

export type MediaType = 'BOOK' | 'MOVIE' | 'PODCAST' | 'SONG' | 'ALBUM' | 'ARTICLE'

export interface User {
  id: string
  email: string
  username: string
  avatar_color: string
  created_at: string
}

export interface MediaItem {
  id: string
  media_type: MediaType
  title: string
  creator: string
  external_url: string | null
  cover_url: string | null
  source: string | null
  source_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface Post {
  id: string
  user_id: string
  media_item_id: string
  note: string | null
  created_at: string
}

export interface PostWithRelations extends Post {
  user: User
  media_item: MediaItem
}

/** Raw PostgREST result when selecting post with user and media_item relations (arrays from join) */
export interface RawPostResult {
  id: string
  user_id: string
  media_item_id: string
  note: string | null
  created_at: string
  user: User | User[]
  media_item: MediaItem | MediaItem[]
}

// API Response types
export interface UserMeResponse {
  user: User
  weeklyPostCount: number
}

export interface FeedResponse {
  items: PostWithRelations[]
  nextCursor?: string
}

export interface SavedIdsResponse {
  postIds: string[]
}

export interface SearchUser {
  id: string
  username: string
  avatar_color: string
}

export interface UserSearchResponse {
  users: SearchUser[]
}

export interface ProfileUser {
  id: string
  username: string
  avatar_color: string
  created_at: string
}

export interface ProfileResponse {
  user: ProfileUser
  postCount: number
  items: PostWithRelations[]
  nextCursor?: string
}

export interface CreatePostRequest {
  media: {
    mediaType: MediaType
    title: string
    creator: string
    externalUrl?: string
    coverUrl?: string
    source?: string
    sourceId?: string
  }
  note?: string
}
