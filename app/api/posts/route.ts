import { createServerComponentClient } from '@/lib/supabase/server'
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
    // Get authenticated user
    const supabase = await createServerComponentClient()
    const {
      data: { user: authUser },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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

    // Use service role key for admin operations
    const supabaseAdmin = createAdminClient()

    // Check weekly limit
    const weeklyCount = await countWeeklyPosts(authUser.id, supabaseAdmin)
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
    })

    // Create post
    const { data: newPost, error: postError } = await supabaseAdmin
      .from('posts')
      .insert({
        user_id: authUser.id,
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
