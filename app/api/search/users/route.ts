import { requireUserId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import type { PaginatedUserResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/search/users?q=...
 * Search users by username. Requires auth. Returns paginated users.
 * Query params: q (required), cursor (optional), limit (optional, default 20, max 50)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireUserId()
    if ('response' in authResult) {
      return authResult.response
    }
    const { userId } = authResult

    const { searchParams } = request.nextUrl
    const q = searchParams.get('q')?.trim()
    const cursor = searchParams.get('cursor')
    const limitParam = searchParams.get('limit')
    const limit = Math.min(limitParam ? parseInt(limitParam, 10) : 20, 50)
    if (!q) {
      return NextResponse.json<PaginatedUserResponse>({ users: [] })
    }

    const supabase = createAdminClient()

    let query = supabase
      .from('users')
      .select('id, username, avatar_color')
      .ilike('username', `%${q}%`)
      .neq('id', userId)
      .order('username', { ascending: true })
      .order('id', { ascending: true })
      .limit(limit + 1)

    if (cursor) {
      const [lastUsername, lastId] = cursor.split(',')
      if (lastUsername && lastId) {
        query = query.or(
          `username.gt.${lastUsername},and(username.eq.${lastUsername},id.gt.${lastId})`
        )
      }
    }

    const { data: users, error } = await query

    if (error) {
      console.error('Error searching users:', error)
      return NextResponse.json(
        { error: 'Search failed' },
        { status: 500 }
      )
    }

    const hasNextPage = users ? users.length > limit : false
    const items = hasNextPage && users ? users.slice(0, limit) : users ?? []
    let nextCursor: string | undefined
    if (hasNextPage && items.length > 0) {
      const lastItem = items[items.length - 1]
      nextCursor = `${lastItem.username},${lastItem.id}`
    }

    const response: PaginatedUserResponse = {
      users: items,
      ...(nextCursor && { nextCursor }),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in /api/search/users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
