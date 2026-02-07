import { requireUserId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/users/me/pings/seen
 * Marks all unseen pings as seen for the current user.
 */
export async function POST() {
  try {
    const authResult = await requireUserId()
    if ('response' in authResult) {
      return authResult.response
    }
    const { userId } = authResult

    const supabase = createAdminClient()
    const seenAt = new Date().toISOString()

    const { error } = await supabase
      .from('pings')
      .update({ seen_at: seenAt })
      .eq('recipient_user_id', userId)
      .is('seen_at', null)

    if (error) {
      console.error('Error marking pings seen:', error)
      return NextResponse.json(
        { error: 'Failed to mark pings seen' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/users/me/pings/seen:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
