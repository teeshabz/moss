import { requireUserId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/posts/[id]/smile
 * Add a smile reaction to a post.
 */
export const dynamic = 'force-dynamic'

export async function POST(
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
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

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
        { error: 'Cannot smile at your own post' },
        { status: 403 }
      )
    }

    const { data: existing } = await supabase
      .from('post_reactions')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .eq('reaction_type', 'smile')
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ success: true, alreadySmiled: true }, { status: 200 })
    }

    const { error: reactionError } = await supabase.from('post_reactions').insert({
      post_id: postId,
      user_id: userId,
      reaction_type: 'smile',
    })

    if (reactionError) {
      console.error('Error creating smile reaction:', reactionError)
      return NextResponse.json(
        { error: 'Failed to smile at post' },
        { status: 500 }
      )
    }

    const { error: pingError } = await supabase.from('pings').insert({
      recipient_user_id: post.user_id,
      actor_user_id: userId,
      post_id: postId,
      type: 'smile',
    })

    if (pingError) {
      console.error('Error creating ping:', pingError)
      return NextResponse.json(
        { error: 'Failed to create ping' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/posts/[id]/smile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/posts/[id]/smile
 * Remove a smile reaction from a post (and its ping).
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
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, user_id')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const { error: reactionError } = await supabase
      .from('post_reactions')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId)
      .eq('reaction_type', 'smile')

    if (reactionError) {
      console.error('Error deleting smile reaction:', reactionError)
      return NextResponse.json(
        { error: 'Failed to remove smile' },
        { status: 500 }
      )
    }

    const { error: pingError } = await supabase
      .from('pings')
      .delete()
      .eq('recipient_user_id', post.user_id)
      .eq('actor_user_id', userId)
      .eq('post_id', postId)
      .eq('type', 'smile')

    if (pingError) {
      console.error('Error deleting ping:', pingError)
      return NextResponse.json(
        { error: 'Failed to remove ping' },
        { status: 500 }
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error in DELETE /api/posts/[id]/smile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
