import { requireUserId } from '@/lib/auth'
import { mapRawPostToPostWithRelations } from '@/lib/api/posts'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import type { FeedResponse, RawPostResult } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/feed
 * Returns paginated feed of posts
 * Query params: cursor (optional), limit (optional, default 20, max 50)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireUserId()
    if ('response' in authResult) {
      return authResult.response
    }
    const { userId } = authResult

    const supabase = createAdminClient()

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const cursor = searchParams.get('cursor')
    const limitParam = searchParams.get('limit')
    const limit = Math.min(
      limitParam ? parseInt(limitParam, 10) : 20,
      50
    )

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

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
      .gte('created_at', sevenDaysAgo)
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

    const postIds = items.map((post: RawPostResult) => post.id)
    const smiledPostIds = new Set<string>()

    if (postIds.length > 0) {
      const { data: reactions, error: reactionsError } = await supabase
        .from('post_reactions')
        .select('post_id')
        .eq('user_id', userId)
        .eq('reaction_type', 'smile')
        .in('post_id', postIds)

      if (reactionsError) {
        console.error('Error fetching smile reactions:', reactionsError)
        return NextResponse.json(
          { error: 'Failed to fetch feed' },
          { status: 500 }
        )
      }

      for (const reaction of reactions ?? []) {
        smiledPostIds.add(reaction.post_id as string)
      }
    }

    const transformedItems = items.map((post: RawPostResult) =>
      mapRawPostToPostWithRelations(post, smiledPostIds.has(post.id))
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
