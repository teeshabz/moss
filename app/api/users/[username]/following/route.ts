import { requireUserId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import type { FollowListResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/users/[username]/following
 * Returns paginated following list for a user.
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
        following_id,
        following:users!follows_following_id_fkey (
          id,
          username,
          avatar_color,
          created_at
        )
      `
      )
      .eq('follower_id', profileUser.id)
      .order('created_at', { ascending: false })
      .order('following_id', { ascending: false })
      .limit(limit + 1)

    if (cursor) {
      const [createdAt, id] = cursor.split(',')
      if (createdAt && id) {
        query = query.or(
          `created_at.lt.${createdAt},and(created_at.eq.${createdAt},following_id.lt.${id})`
        )
      }
    }

    const { data: rows, error: rowsError } = await query

    if (rowsError) {
      console.error('Error fetching following:', rowsError)
      return NextResponse.json(
        { error: 'Failed to load following' },
        { status: 500 }
      )
    }

    const hasNextPage = rows ? rows.length > limit : false
    const items = hasNextPage && rows ? rows.slice(0, limit) : rows ?? []

    const followingUsers = items
      .map((row) => {
        const following = Array.isArray(row.following) ? row.following[0] : row.following
        return following
          ? {
              id: following.id as string,
              username: following.username as string,
              avatar_color: (following.avatar_color ?? '') as string,
              created_at: following.created_at as string,
            }
          : null
      })
      .filter((user) => user !== null)

    const followingIds = followingUsers.map((user) => user!.id)
    const followingSet = new Set<string>()

    if (followingIds.length > 0) {
      const { data: followingRows, error: followingError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
        .in('following_id', followingIds)

      if (followingError) {
        console.error('Error fetching following status:', followingError)
        return NextResponse.json(
          { error: 'Failed to load following' },
          { status: 500 }
        )
      }

      for (const row of followingRows ?? []) {
        followingSet.add(row.following_id as string)
      }
    }

    const users = followingUsers.map((user) => ({
      ...user!,
      isFollowing: followingSet.has(user!.id),
    }))

    let nextCursor: string | undefined
    if (hasNextPage && items.length > 0) {
      const lastItem = items[items.length - 1]
      nextCursor = `${lastItem.created_at},${lastItem.following_id}`
    }

    const response: FollowListResponse = {
      users,
      ...(nextCursor && { nextCursor }),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in /api/users/[username]/following:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
