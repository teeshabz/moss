import { requireUserId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    const authResult = await requireUserId()
    if ('response' in authResult) {
      return authResult.response
    }
    const { userId } = authResult

    const postId = params.id
    const noteId = params.noteId
    if (!postId || !noteId) {
      return NextResponse.json(
        { error: 'Post id and note id are required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()

    const { data: note, error: noteError } = await supabaseAdmin
      .from('post_notes')
      .select('id, post_id, user_id')
      .eq('id', noteId)
      .single()

    if (noteError || !note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    if (note.post_id !== postId) {
      return NextResponse.json(
        { error: 'Note does not belong to post' },
        { status: 400 }
      )
    }

    if (note.user_id !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to delete this note' },
        { status: 403 }
      )
    }

    const { data: post, error: postError } = await supabaseAdmin
      .from('posts')
      .select('id, user_id')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    const { error: deleteError } = await supabaseAdmin
      .from('post_notes')
      .delete()
      .eq('id', noteId)

    if (deleteError) {
      console.error('Error deleting note:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete note' },
        { status: 500 }
      )
    }

    const { error: pingError } = await supabaseAdmin
      .from('pings')
      .delete()
      .eq('recipient_user_id', post.user_id)
      .eq('actor_user_id', userId)
      .eq('post_id', postId)
      .eq('type', 'note')

    if (pingError) {
      console.error('Error deleting ping:', pingError)
    }

    return NextResponse.json(
      { success: true },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in DELETE /api/posts/[id]/notes/[noteId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
