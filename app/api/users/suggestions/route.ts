import { requireUserId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import type { PaginatedUserResponse, SearchUser } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/users/suggestions
 * Returns a list of recently active users based on recent posts.
 * Query params: limit (optional, default 20, max 50), cursor (optional)
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
    const cursor = searchParams.get('cursor')
    const limit = Math.min(limitParam ? parseInt(limitParam, 10) : 20, 50)
    const fetchLimit = Math.min(limit * 5, 100)

    const supabase = createAdminClient()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    let query = supabase
      .from('posts')
      .select(
        `
        id,
        created_at,
        user:users!posts_user_id_fkey (
          id,
          username,
          avatar_color
        )
      `
      )
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(fetchLimit + 1)

    if (cursor) {
      const [createdAt, postId] = cursor.split(',')
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

    const hasNextPage = rows ? rows.length > fetchLimit : false
    const items = hasNextPage && rows ? rows.slice(0, fetchLimit) : rows ?? []
    const seen = new Set<string>()
    const users: SearchUser[] = []

    for (const row of items) {
      const user = Array.isArray(row.user) ? row.user[0] : row.user
      if (!user) continue
      if (user.id === userId) continue
      if (seen.has(user.id as string)) continue
      seen.add(user.id as string)
      users.push({
        id: user.id as string,
        username: user.username as string,
        avatar_color: (user.avatar_color ?? '') as string,
      })
      if (users.length >= limit) break
    }

    let nextCursor: string | undefined
    if (hasNextPage && items.length > 0) {
      const lastItem = items[items.length - 1]
      nextCursor = `${lastItem.created_at},${lastItem.id}`
    }

    const response: PaginatedUserResponse = {
      users,
      ...(nextCursor && { nextCursor }),
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
