import { getUserId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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
