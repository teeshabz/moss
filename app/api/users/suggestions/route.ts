import { requireUserId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import type { PaginatedUserResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/users/suggestions
 * Lists all users (except the current user) for find-friends when the search box is empty.
 * Ordered by username, then id. Supports cursor pagination (same composite cursor as search).
 * Query: limit (optional, default 20, max 50), cursor (optional, "username,id")
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

    const supabase = createAdminClient()

    let query = supabase
      .from('users')
      .select('id, username, avatar_color')
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
      console.error('Error fetching user suggestions:', error)
      return NextResponse.json(
        { error: 'Failed to load suggestions' },
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
    console.error('Error in /api/users/suggestions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
