import { requireUserId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import type { PaginatedUserResponse, SearchUser } from '@/lib/types'

export const dynamic = 'force-dynamic'

const BATCH = 200
const MAX_BATCHES = 40

/**
 * GET /api/users/suggestions
 * Returns distinct users ordered by most recent post (latest activity first).
 * Scans recent posts in batches until `limit` users are found or posts are exhausted.
 * Query params: limit (optional, default 20, max 50). Cursor is ignored (single-page list).
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireUserId()
    if ('response' in authResult) {
      return authResult.response
    }
    const { userId } = authResult

    const searchParams = request.nextUrl.searchParams
    const limitParam = searchParams.get('limit')
    const userLimit = Math.min(limitParam ? parseInt(limitParam, 10) : 20, 50)

    const supabase = createAdminClient()
    const users: SearchUser[] = []
    const seenUserIds = new Set<string>()
    let postCursor: string | undefined

    for (let batch = 0; batch < MAX_BATCHES && users.length < userLimit; batch++) {
      let query = supabase
        .from('posts')
        .select(
          `
        id,
        created_at,
        user_id,
        user:users!posts_user_id_fkey (
          id,
          username,
          avatar_color
        )
      `
        )
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(BATCH + 1)

      if (postCursor) {
        const [createdAt, postId] = postCursor.split(',')
        if (createdAt && postId) {
          query = query.or(
            `created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${postId})`
          )
        }
      }

      const { data: rows, error } = await query

      if (error) {
        console.error('Error fetching user suggestions:', error)
        return NextResponse.json(
          { error: 'Failed to load suggestions' },
          { status: 500 }
        )
      }

      if (!rows?.length) break

      const hasMorePosts = rows.length > BATCH
      const slice = hasMorePosts ? rows.slice(0, BATCH) : rows

      for (const row of slice) {
        const uid = row.user_id as string | undefined
        if (!uid || uid === userId) continue
        if (seenUserIds.has(uid)) continue

        const u = Array.isArray(row.user) ? row.user[0] : row.user
        if (!u) continue

        seenUserIds.add(uid)
        users.push({
          id: u.id as string,
          username: u.username as string,
          avatar_color: (u.avatar_color ?? '') as string,
        })
        if (users.length >= userLimit) break
      }

      if (!hasMorePosts) break
      const last = slice[slice.length - 1]
      postCursor = `${last.created_at},${last.id}`
      if (users.length >= userLimit) break
    }

    const response: PaginatedUserResponse = {
      users,
    }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in /api/users/suggestions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
