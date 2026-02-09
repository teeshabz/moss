import { requireUserId } from '@/lib/auth'
import { mapRawPostToPostWithRelations } from '@/lib/api/posts'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import type { RawPostResult } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/posts/[id]
 * Returns a single post with user and media_item for the current user (e.g. opening from a ping).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireUserId()
    if ('response' in authResult) {
      return authResult.response
    }
    const { userId } = authResult

    const postId = params.id
    if (!postId || postId.trim().length === 0) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()

    const { data: post, error: fetchError } = await supabaseAdmin
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
      .eq('id', postId)
      .single()

    if (fetchError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    const [smiled, noted] = await Promise.all([
      supabaseAdmin
        .from('post_reactions')
        .select('post_id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .eq('reaction_type', 'smile')
        .maybeSingle(),
      supabaseAdmin
        .from('post_notes')
        .select('post_id')
        .eq('post_id', postId)
        .limit(1)
        .maybeSingle(),
    ])

    const smiledByCurrentUser = Boolean(smiled.data)
    const hasNotes = Boolean(noted.data)

    const mapped = mapRawPostToPostWithRelations(
      post as RawPostResult,
      smiledByCurrentUser,
      hasNotes
    )

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Error in GET /api/posts/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/posts/[id]
 * Delete a post. Only the post owner can delete.
 * Returns 204 on success.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireUserId()
    if ('response' in authResult) {
      return authResult.response
    }
    const { userId } = authResult

    const postId = params.id
    if (!postId || postId.trim().length === 0) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()

    const { data: post, error: fetchError } = await supabaseAdmin
      .from('posts')
      .select('id, user_id')
      .eq('id', postId)
      .single()

    if (fetchError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    if (post.user_id !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { error: deleteError } = await supabaseAdmin
      .from('posts')
      .delete()
      .eq('id', postId)

    if (deleteError) {
      console.error('Error deleting post:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete post' },
        { status: 500 }
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error in DELETE /api/posts/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
