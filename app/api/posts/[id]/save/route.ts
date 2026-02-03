import { getUserId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/posts/[id]/save
 * Save a post for the current user.
 *
 * DELETE /api/posts/[id]/save
 * Unsave a post for the current user.
 */
export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const postId = params.id
    if (!postId || postId.trim().length === 0) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Ensure post exists and is not authored by current user
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, user_id')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (post.user_id === userId) {
      return NextResponse.json(
        { error: 'Cannot save your own post' },
        { status: 403 }
      )
    }

    const { error: saveError } = await supabase
      .from('saves')
      .upsert(
        { user_id: userId, post_id: postId },
        { onConflict: 'user_id,post_id' }
      )

    if (saveError) {
      console.error('Error saving post:', saveError)
      return NextResponse.json(
        { error: 'Failed to save post' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/posts/[id]/save:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const postId = params.id
    if (!postId || postId.trim().length === 0) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { error: deleteError } = await supabase
      .from('saves')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId)

    if (deleteError) {
      console.error('Error deleting save:', deleteError)
      return NextResponse.json(
        { error: 'Failed to unsave post' },
        { status: 500 }
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error in DELETE /api/posts/[id]/save:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
