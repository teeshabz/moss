import { mapRawPostToPostWithRelations } from '@/lib/api/posts'
import { createServerComponentClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { FeedResponse, RawPostResult } from '@/lib/types'

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
      .limit(limit + 1)

    if (cursor) {
      const [createdAt, id] = cursor.split(',')
      if (createdAt && id) {
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
      return NextResponse.json<FeedResponse>({ items: [] })
    }

    const hasNextPage = posts.length > limit
    const items = hasNextPage ? posts.slice(0, limit) : posts

    const transformedItems = items.map((post: RawPostResult) =>
      mapRawPostToPostWithRelations(post)
    )

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
