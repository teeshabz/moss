import { createServerComponentClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { FeedResponse, PostWithRelations, User, MediaItem } from '@/lib/types'

// Type for raw post result from Supabase query with relations
interface RawPostResult {
  id: string
  user_id: string
  media_item_id: string
  note: string | null
  created_at: string
  user: User | User[]
  media_item: MediaItem | MediaItem[]
}

/**
 * GET /api/feed
 * Returns paginated feed of posts
 * Query params: cursor (optional), limit (optional, default 20, max 50)
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerComponentClient()
    const {
      data: { user: authUser },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const cursor = searchParams.get('cursor')
    const limitParam = searchParams.get('limit')
    const limit = Math.min(
      limitParam ? parseInt(limitParam, 10) : 20,
      50
    )

    // Build query
    let query = supabase
      .from('posts')
      .select(`
        id,
        user_id,
        media_item_id,
        note,
        created_at,
        user:users!posts_user_id_fkey (
          id,
          email,
          username,
          avatar_color,
          created_at
        ),
        media_item:media_items!posts_media_item_id_fkey (
          id,
          media_type,
          title,
          creator,
          external_url,
          cover_url,
          source,
          source_id,
          metadata,
          created_at
        )
      `)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1) // Fetch one extra to check if there's a next page

    // Apply cursor pagination if provided
    if (cursor) {
      // Parse cursor (format: "created_at,id")
      const [createdAt, id] = cursor.split(',')
      if (createdAt && id) {
        // Filter: created_at < createdAt OR (created_at = createdAt AND id < id)
        // Supabase PostgREST syntax for this is:
        query = query.or(
          `created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id})`
        )
      }
    }

    const { data: posts, error } = await query

    if (error) {
      console.error('Error fetching feed:', error)
      return NextResponse.json(
        { error: 'Failed to fetch feed' },
        { status: 500 }
      )
    }

    if (!posts) {
      return NextResponse.json<FeedResponse>({
        items: [],
      })
    }

    // Check if there's a next page
    const hasNextPage = posts.length > limit
    const items = hasNextPage ? posts.slice(0, limit) : posts

    // Transform to PostWithRelations format
    const transformedItems: PostWithRelations[] = items.map((post: RawPostResult) => ({
      id: post.id,
      user_id: post.user_id,
      media_item_id: post.media_item_id,
      note: post.note,
      created_at: post.created_at,
      user: Array.isArray(post.user) ? post.user[0] : post.user,
      media_item: Array.isArray(post.media_item)
        ? post.media_item[0]
        : post.media_item,
    }))

    // Generate next cursor if there's a next page
    let nextCursor: string | undefined
    if (hasNextPage && items.length > 0) {
      const lastItem = items[items.length - 1]
      nextCursor = `${lastItem.created_at},${lastItem.id}`
    }

    const response: FeedResponse = {
      items: transformedItems,
      ...(nextCursor && { nextCursor }),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in /api/feed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
