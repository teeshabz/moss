import { requireUserId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/users/[username]/follow
 * Follow a user by username.
 *
 * DELETE /api/users/[username]/follow
 * Unfollow a user by username.
 */
export async function POST(
  _request: NextRequest,
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

    const supabase = createAdminClient()

    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, username')
      .ilike('username', username)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (targetUser.id === userId) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 403 }
      )
    }

    console.log('follow: creating follow + ping', {
      followerId: userId,
      followingId: targetUser.id,
    })

    const [followResult, pingResult] = await Promise.all([
      supabase
        .from('follows')
        .upsert(
          { follower_id: userId, following_id: targetUser.id },
          { onConflict: 'follower_id,following_id' }
        ),
      supabase
        .from('pings')
        .insert({
          recipient_user_id: targetUser.id,
          actor_user_id: userId,
          post_id: null,
          type: 'follow',
        }),
    ])

    if (followResult.error) {
      console.error('Error following user:', followResult.error)
      return NextResponse.json(
        { error: 'Failed to follow user' },
        { status: 500 }
      )
    }

    if (pingResult.error && pingResult.error.code !== '23505') {
      console.error('Error creating follow ping:', pingResult.error)
      return NextResponse.json(
        { error: 'Failed to follow user' },
        { status: 500 }
      )
    }

    console.log('follow: follow + ping created', {
      followerId: userId,
      followingId: targetUser.id,
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/users/[username]/follow:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
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

    const supabase = createAdminClient()

    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, username')
      .ilike('username', username)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (targetUser.id === userId) {
      return NextResponse.json(
        { error: 'Cannot unfollow yourself' },
        { status: 403 }
      )
    }

    console.log('follow: deleting follow + ping', {
      followerId: userId,
      followingId: targetUser.id,
    })

    const [deleteFollow, deletePing] = await Promise.all([
      supabase
        .from('follows')
        .delete()
        .eq('follower_id', userId)
        .eq('following_id', targetUser.id),
      supabase
        .from('pings')
        .delete()
        .eq('recipient_user_id', targetUser.id)
        .eq('actor_user_id', userId)
        .eq('type', 'follow'),
    ])

    if (deleteFollow.error) {
      console.error('Error unfollowing user:', deleteFollow.error)
      return NextResponse.json(
        { error: 'Failed to unfollow user' },
        { status: 500 }
      )
    }

    if (deletePing.error) {
      console.error('Error removing follow ping:', deletePing.error)
      return NextResponse.json(
        { error: 'Failed to unfollow user' },
        { status: 500 }
      )
    }

    console.log('follow: follow + ping deleted', {
      followerId: userId,
      followingId: targetUser.id,
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error in DELETE /api/users/[username]/follow:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
