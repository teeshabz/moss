import { requireUserId } from '@/lib/auth'
import { mapRawPostToPostWithRelations } from '@/lib/api/posts'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { isValidFeedMediaType } from '@/lib/share-media-config'
import type { FeedResponse, MediaType, RawPostResult } from '@/lib/types'

export const dynamic = 'force-dynamic'

/** Most recent posts returned per feed request (no date window; no pagination). */
const FEED_POST_LIMIT = 41

/**
 * GET /api/feed
 * Returns the most recent posts (up to FEED_POST_LIMIT).
 * Query: mode (optional: "following"); type (optional: MediaType enum, e.g. BOOK).
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
    const mode = searchParams.get('mode')?.toLowerCase()
    const typeRaw = searchParams.get('type')?.trim().toUpperCase() ?? ''
    if (searchParams.has('type') && typeRaw && !isValidFeedMediaType(typeRaw)) {
      return NextResponse.json(
        { error: 'Invalid type. Use BOOK, ARTICLE, SONG, ALBUM, PODCAST, MOVIE, or LIVE.' },
        { status: 400 }
      )
    }
    const mediaTypeFilter: MediaType | null =
      typeRaw && isValidFeedMediaType(typeRaw) ? typeRaw : null

    const mediaJoin = mediaTypeFilter
      ? `media_item:media_items!posts_media_item_id_fkey!inner (
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
        )`
      : `media_item:media_items!posts_media_item_id_fkey (
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
        )`

    let query = supabase
      .from('posts')
      .select(
        `
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
        ${mediaJoin}
      `
      )
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(FEED_POST_LIMIT)

    if (mediaTypeFilter) {
      query = query.eq('media_item.media_type', mediaTypeFilter)
    }

    if (mode === 'following') {
      const { data: followRows, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)

      if (followError) {
        console.error('Error fetching follow list:', followError)
        return NextResponse.json(
          { error: 'Failed to fetch feed' },
          { status: 500 }
        )
      }

      const userIds = new Set<string>([userId])
      for (const row of followRows ?? []) {
        if (row.following_id) {
          userIds.add(row.following_id as string)
        }
      }

      query = query.in('user_id', Array.from(userIds))
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

    const items = posts

    const postIds = items.map((post: RawPostResult) => post.id)
    const smiledPostIds = new Set<string>()
    const notedPostIds = new Set<string>()

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

      const { data: noteRows, error: notesError } = await supabase
        .from('post_notes')
        .select('post_id')
        .in('post_id', postIds)

      if (notesError) {
        console.error('Error fetching post notes:', notesError)
        return NextResponse.json(
          { error: 'Failed to fetch feed' },
          { status: 500 }
        )
      }

      for (const note of noteRows ?? []) {
        notedPostIds.add(note.post_id as string)
      }
    }

    const transformedItems = items.map((post: RawPostResult) =>
      mapRawPostToPostWithRelations(
        post,
        smiledPostIds.has(post.id),
        notedPostIds.has(post.id)
      )
    )

    const response: FeedResponse = {
      items: transformedItems,
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
