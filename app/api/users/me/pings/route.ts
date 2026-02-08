import { requireUserId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/users/me/pings
 * Returns pings for current user.
 */
export async function GET(_request: NextRequest) {
  try {
    const authResult = await requireUserId()
    if ('response' in authResult) {
      return authResult.response
    }
    const { userId } = authResult

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('pings')
      .select(`
        id,
        recipient_user_id,
        actor_user_id,
        post_id,
        type,
        created_at,
        seen_at,
        actor:users!pings_actor_user_id_fkey (
          id,
          username,
          avatar_color
        ),
        post:posts!pings_post_id_fkey (
          id,
          media_item:media_items!posts_media_item_id_fkey (
            title
          )
        )
      `)
      .eq('recipient_user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch pings' },
        { status: 500 }
      )
    }

    const items = (data ?? []).map((row) => {
      const actor = Array.isArray(row.actor) ? row.actor[0] : row.actor
      const post = Array.isArray(row.post) ? row.post[0] : row.post
      const mediaItem = post
        ? Array.isArray(post.media_item)
          ? post.media_item[0]
          : post.media_item
        : null

      return {
        id: row.id as string,
        recipient_user_id: row.recipient_user_id as string,
        actor_user_id: row.actor_user_id as string,
        post_id: (row.post_id as string | null) ?? null,
        type: row.type as string,
        created_at: row.created_at as string,
        seen_at: (row.seen_at as string | null) ?? null,
        actor: actor
          ? {
              id: actor.id as string,
              username: actor.username as string,
              avatar_color: (actor.avatar_color as string) ?? '',
            }
          : null,
        postTitle: row.type === 'follow' ? '' : (mediaItem?.title as string) ?? '',
      }
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Error in GET /api/users/me/pings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
