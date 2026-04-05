/**
 * Shared TypeScript types for Moss API
 */

export type MediaType = 'BOOK' | 'MOVIE' | 'PODCAST' | 'SONG' | 'ALBUM' | 'ARTICLE' | 'LIVE'

export interface User {
  id: string
  email: string
  username: string
  avatar_color: string
  phone_number?: string | null
  first_name?: string | null
  last_name?: string | null
  created_at: string
}

export interface Follow {
  follower_id: string
  following_id: string
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

export interface Note {
  id: string
  post_id: string
  user_id: string
  text: string
  created_at: string
}

export interface NoteWithAuthor extends Note {
  user: Pick<User, 'id' | 'username' | 'avatar_color' | 'created_at'>
}

export interface PostWithRelations extends Post {
  user: User
  media_item: MediaItem
  smiledByCurrentUser: boolean
  hasNotes?: boolean
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
  /** When present, feed can skip separate saved-ids request */
  postIds?: string[]
}

export interface FeedResponse {
  items: PostWithRelations[]
  nextCursor?: string
}

export interface NotesResponse {
  items: NoteWithAuthor[]
  hasNoted: boolean
}

export interface SavedIdsResponse {
  postIds: string[]
}

export interface PingActor {
  id: string
  username: string
  avatar_color: string
}

export interface PingItem {
  id: string
  recipient_user_id: string
  actor_user_id: string
  post_id: string | null
  type: string
  created_at: string
  seen_at: string | null
  actor: PingActor | null
  postTitle: string
  /** Whether the current user follows the actor (for follow pings). */
  actorIsFollowing?: boolean
}

export interface PingsResponse {
  items: PingItem[]
}

export interface SearchUser {
  id: string
  username: string
  avatar_color: string
}

export interface FollowListUser {
  id: string
  username: string
  avatar_color: string
  created_at: string
  isFollowing?: boolean
  isFollowedBy?: boolean
}

export interface FollowListResponse {
  users: FollowListUser[]
  nextCursor?: string
  /** Total people this user follows (all pages). */
  followingCount?: number
}

export interface UserSearchResponse {
  users: SearchUser[]
}

export interface PaginatedUserResponse {
  users: SearchUser[]
  nextCursor?: string
}

export interface ProfileUser {
  id: string
  username: string
  avatar_color: string
  phone_number?: string | null
  first_name?: string | null
  last_name?: string | null
  created_at: string
  followerCount?: number
  followingCount?: number
  isFollowing?: boolean
  isFollowedBy?: boolean
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
    metadata?: Record<string, unknown> | null
  }
  note?: string
}
