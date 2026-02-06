import { requireUserId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/users/me/saved-ids
 * Returns paginated post IDs saved by the current user.
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

    const searchParams = request.nextUrl.searchParams
    const cursor = searchParams.get('cursor')
    const limitParam = searchParams.get('limit')
    const limit = Math.min(
      limitParam ? parseInt(limitParam, 10) : 20,
      50
    )

    let query = supabase
      .from('saves')
      .select('post_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('post_id', { ascending: false })
      .limit(limit + 1)

    if (cursor) {
      const [createdAt, postId] = cursor.split(',')
      if (createdAt && postId) {
        query = query.or(
          `created_at.lt.${createdAt},and(created_at.eq.${createdAt},post_id.lt.${postId})`
        )
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching saved ids:', error)
      return NextResponse.json(
        { error: 'Failed to load saved posts' },
        { status: 500 }
      )
    }

    const hasNextPage = (data ?? []).length > limit
    const pageData = hasNextPage ? (data ?? []).slice(0, limit) : (data ?? [])
    const postIds = pageData.map((row) => row.post_id as string)

    let nextCursor: string | undefined
    if (hasNextPage && data && data.length > 0) {
      const last = data[limit] as { created_at: string; post_id: string }
      nextCursor = `${last.created_at},${last.post_id}`
    }

    return NextResponse.json({
      postIds,
      ...(nextCursor && { nextCursor }),
    })
  } catch (error) {
    console.error('Error in /api/users/me/saved-ids:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
