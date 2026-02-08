import { requireUserId } from '@/lib/auth'
import { mapRawPostToPostWithRelations } from '@/lib/api/posts'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import type { ProfileResponse, RawPostResult } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/users/[username]
 * Returns user profile (no email) + post count + cursor-paginated posts
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

    const username = params.username
    if (!username || username.trim().length === 0) {
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

    const supabaseAdmin = createAdminClient()

    const { data: profileUser, error: userLookupError } = await supabaseAdmin
      .from('users')
      .select('id, username, avatar_color, created_at')
      .ilike('username', username.trim())
      .single()

    if (userLookupError || !profileUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const [
      { count: postCount, error: countError },
      { count: followerCount, error: followerCountError },
      { count: followingCount, error: followingCountError },
      { data: followRow, error: followError },
      { data: followedByRow, error: followedByError },
    ] = await Promise.all([
      supabaseAdmin
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profileUser.id),
      supabaseAdmin
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileUser.id),
      supabaseAdmin
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profileUser.id),
      supabaseAdmin
        .from('follows')
        .select('follower_id')
        .eq('follower_id', userId)
        .eq('following_id', profileUser.id)
        .maybeSingle(),
      supabaseAdmin
        .from('follows')
        .select('follower_id')
        .eq('follower_id', profileUser.id)
        .eq('following_id', userId)
        .maybeSingle(),
    ])

    if (countError || followerCountError || followingCountError || followError || followedByError) {
      console.error('Error loading profile stats:', {
        countError,
        followerCountError,
        followingCountError,
        followError,
        followedByError,
      })
      return NextResponse.json(
        { error: 'Failed to load profile' },
        { status: 500 }
      )
    }

    const safePostCount = postCount ?? 0
    const safeFollowerCount = followerCount ?? 0
    const safeFollowingCount = followingCount ?? 0
    const isFollowing = Boolean(followRow)
    const isFollowedBy = Boolean(followedByRow)

    let query = supabaseAdmin
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
      .eq('user_id', profileUser.id)
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

    const { data: posts, error: postsError } = await query

    if (postsError) {
      console.error('Error fetching profile posts:', postsError)
      return NextResponse.json(
        { error: 'Failed to load posts' },
        { status: 500 }
      )
    }

    const hasNextPage = posts ? posts.length > limit : false
    const items = hasNextPage && posts ? posts.slice(0, limit) : posts ?? []

    const postIds = (items as RawPostResult[]).map((post) => post.id)
    const smiledPostIds = new Set<string>()
    const notedPostIds = new Set<string>()

    if (postIds.length > 0) {
      const { data: reactions, error: reactionsError } = await supabaseAdmin
        .from('post_reactions')
        .select('post_id')
        .eq('user_id', userId)
        .eq('reaction_type', 'smile')
        .in('post_id', postIds)

      if (reactionsError) {
        console.error('Error fetching profile smile reactions:', reactionsError)
        return NextResponse.json(
          { error: 'Failed to load posts' },
          { status: 500 }
        )
      }

      for (const reaction of reactions ?? []) {
        smiledPostIds.add(reaction.post_id as string)
      }

      const { data: noteRows, error: notesError } = await supabaseAdmin
        .from('post_notes')
        .select('post_id')
        .in('post_id', postIds)

      if (notesError) {
        console.error('Error fetching profile post notes:', notesError)
        return NextResponse.json(
          { error: 'Failed to load posts' },
          { status: 500 }
        )
      }

      for (const note of noteRows ?? []) {
        notedPostIds.add(note.post_id as string)
      }
    }

    const transformedItems = (items as RawPostResult[]).map((post) =>
      mapRawPostToPostWithRelations(
        post,
        smiledPostIds.has(post.id),
        notedPostIds.has(post.id)
      )
    )

    let nextCursor: string | undefined
    if (hasNextPage && items.length > 0) {
      const lastItem = items[items.length - 1] as RawPostResult
      nextCursor = `${lastItem.created_at},${lastItem.id}`
    }

    const result: ProfileResponse = {
      user: {
        id: profileUser.id,
        username: profileUser.username,
        avatar_color: profileUser.avatar_color ?? '',
        created_at: profileUser.created_at,
        followerCount: safeFollowerCount,
        followingCount: safeFollowingCount,
        isFollowing,
        isFollowedBy,
      },
      postCount: safePostCount,
      items: transformedItems,
      ...(nextCursor && { nextCursor }),
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in /api/users/[username]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
