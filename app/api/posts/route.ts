import { requireUserId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { countWeeklyPosts, WEEKLY_POST_LIMIT } from '@/lib/api/weekly-limit'
import { validateMediaData, findOrCreateMediaItem } from '@/lib/api/media'
import type { CreatePostRequest } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/posts
 * Create a new post
 * Body: { media: { mediaType, title, creator, externalUrl?, coverUrl? }, note?: string }
 */
export async function POST(request: Request) {
  try {
    const authResult = await requireUserId()
    if ('response' in authResult) {
      return authResult.response
    }
    const { userId } = authResult

    // Parse request body
    const body: CreatePostRequest = await request.json()

    if (!body.media) {
      return NextResponse.json(
        { error: 'Media data is required' },
        { status: 400 }
      )
    }

    // Validate media data
    try {
      validateMediaData(body.media.mediaType, body.media)
    } catch (validationError) {
      return NextResponse.json(
        {
          error: validationError instanceof Error ? validationError.message : 'Validation failed',
          code: 'validation_error',
        },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()

    // Check weekly limit
    const weeklyCount = await countWeeklyPosts(userId, supabaseAdmin)
    if (weeklyCount >= WEEKLY_POST_LIMIT) {
      return NextResponse.json(
        {
          error: "you've already posted 3 times this week. come back next week!",
          code: 'weekly_limit_exceeded',
        },
        { status: 409 }
      )
    }

    // Find or create media item (handles deduplication)
    const mediaItemId = await findOrCreateMediaItem(supabaseAdmin, {
      mediaType: body.media.mediaType,
      title: body.media.title,
      creator: body.media.creator,
      externalUrl: body.media.externalUrl,
      coverUrl: body.media.coverUrl,
      source: body.media.source,
      sourceId: body.media.sourceId,
      metadata: body.media.metadata ?? null,
    })

    // Create post
    const { data: newPost, error: postError } = await supabaseAdmin
      .from('posts')
      .insert({
        user_id: userId,
        media_item_id: mediaItemId,
        note: body.note?.trim() || null,
      })
      .select()
      .single()

    if (postError) {
      console.error('Error creating post:', postError)
      return NextResponse.json(
        { error: 'Failed to create post' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { post: newPost },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in /api/posts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
