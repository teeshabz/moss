import { mapRawPostToPostWithRelations } from '@/lib/api/posts'
import { createServerComponentClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { FeedResponse, RawPostResult } from '@/lib/types'

interface SaveRow {
  post_id: string
  created_at: string
}

/**
 * GET /api/users/me/saved
 * Returns paginated list of posts the current user has saved.
 * Query params: cursor (optional), limit (optional, default 20, max 50)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient()
    const {
      data: { user: authUser },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const cursor = searchParams.get('cursor')
    const limitParam = searchParams.get('limit')
    const limit = Math.min(
      limitParam ? parseInt(limitParam, 10) : 20,
      50
    )

    // First, page through saves to get post IDs in saved order
    let savesQuery = supabase
      .from('saves')
      .select('post_id, created_at')
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false })
      .order('post_id', { ascending: false })
      .limit(limit + 1)

    if (cursor) {
      const [createdAt, postId] = cursor.split(',')
      if (createdAt && postId) {
        savesQuery = savesQuery.or(
          `created_at.lt.${createdAt},and(created_at.eq.${createdAt},post_id.lt.${postId})`
        )
      }
    }

    const { data: saves, error: savesError } = await savesQuery

    if (savesError) {
      console.error('Error fetching saved posts:', savesError)
      return NextResponse.json(
        { error: 'Failed to load saved posts' },
        { status: 500 }
      )
    }

    if (!saves || saves.length === 0) {
      const empty: FeedResponse = { items: [] }
      return NextResponse.json(empty)
    }

    const hasNextPage = saves.length > limit
    const pageSaves = (hasNextPage ? saves.slice(0, limit) : saves) as SaveRow[]

    const postIds = pageSaves.map((row) => row.post_id)

    if (postIds.length === 0) {
      const empty: FeedResponse = { items: [] }
      return NextResponse.json(empty)
    }

    // Fetch posts and relations for these IDs
    const { data: posts, error: postsError } = await supabase
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
      .in('id', postIds)

    if (postsError) {
      console.error('Error fetching saved post details:', postsError)
      return NextResponse.json(
        { error: 'Failed to load saved posts' },
        { status: 500 }
      )
    }

    const postsById = new Map<string, RawPostResult>()
    ;(posts as RawPostResult[]).forEach((p) => {
      postsById.set(p.id, p)
    })

    const transformedItems = pageSaves
      .map((save) => postsById.get(save.post_id))
      .filter((p): p is RawPostResult => !!p)
      .map(mapRawPostToPostWithRelations)

    let nextCursor: string | undefined
    if (hasNextPage && saves.length > 0) {
      const last = saves[limit] as SaveRow
      nextCursor = `${last.created_at},${last.post_id}`
    }

    const response: FeedResponse = {
      items: transformedItems,
      ...(nextCursor && { nextCursor }),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in /api/users/me/saved:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

