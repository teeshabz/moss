import { requireUserId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import type { FollowListResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/users/[username]/followers
 * Returns paginated followers for a user.
 * Query params: cursor (optional), limit (optional, default 20, max 50)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const authResult = await requireUserId()
    if ('response' in authResult) {
      return authResult.response
    }
    const { userId } = authResult

    const username = params.username?.trim()
    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const cursor = searchParams.get('cursor')
    const limitParam = searchParams.get('limit')
    const limit = Math.min(
      limitParam ? parseInt(limitParam, 10) : 20,
      50
    )

    const supabase = createAdminClient()

    const { data: profileUser, error: userError } = await supabase
      .from('users')
      .select('id, username')
      .ilike('username', username)
      .single()

    if (userError || !profileUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let query = supabase
      .from('follows')
      .select(
        `
        created_at,
        follower_id,
        follower:users!follows_follower_id_fkey (
          id,
          username,
          avatar_color,
          created_at
        )
      `
      )
      .eq('following_id', profileUser.id)
      .order('created_at', { ascending: false })
      .order('follower_id', { ascending: false })
      .limit(limit + 1)

    if (cursor) {
      const [createdAt, id] = cursor.split(',')
      if (createdAt && id) {
        query = query.or(
          `created_at.lt.${createdAt},and(created_at.eq.${createdAt},follower_id.lt.${id})`
        )
      }
    }

    const { data: rows, error: rowsError } = await query

    if (rowsError) {
      console.error('Error fetching followers:', rowsError)
      return NextResponse.json(
        { error: 'Failed to load followers' },
        { status: 500 }
      )
    }

    const hasNextPage = rows ? rows.length > limit : false
    const items = hasNextPage && rows ? rows.slice(0, limit) : rows ?? []

    const followerUsers = items
      .map((row) => {
        const follower = Array.isArray(row.follower) ? row.follower[0] : row.follower
        return follower
          ? {
              id: follower.id as string,
              username: follower.username as string,
              avatar_color: (follower.avatar_color ?? '') as string,
              created_at: follower.created_at as string,
            }
          : null
      })
      .filter((user) => user !== null)

    const followerIds = followerUsers.map((user) => user!.id)
    const followingSet = new Set<string>()

    if (followerIds.length > 0) {
      const { data: followingRows, error: followingError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
        .in('following_id', followerIds)

      if (followingError) {
        console.error('Error fetching follower status:', followingError)
        return NextResponse.json(
          { error: 'Failed to load followers' },
          { status: 500 }
        )
      }

      for (const row of followingRows ?? []) {
        followingSet.add(row.following_id as string)
      }
    }

    const users = followerUsers.map((user) => ({
      ...user!,
      isFollowing: followingSet.has(user!.id),
    }))

    let nextCursor: string | undefined
    if (hasNextPage && items.length > 0) {
      const lastItem = items[items.length - 1]
      nextCursor = `${lastItem.created_at},${lastItem.follower_id}`
    }

    const response: FollowListResponse = {
      users,
      ...(nextCursor && { nextCursor }),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in /api/users/[username]/followers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
