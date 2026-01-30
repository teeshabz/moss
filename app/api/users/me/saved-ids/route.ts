import { createServerComponentClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/users/me/saved-ids
 * Returns all post IDs saved by the current user.
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerComponentClient()
    const {
      data: { user: authUser },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('saves')
      .select('post_id')
      .eq('user_id', authUser.id)

    if (error) {
      console.error('Error fetching saved ids:', error)
      return NextResponse.json(
        { error: 'Failed to load saved posts' },
        { status: 500 }
      )
    }

    const postIds = (data ?? []).map((row) => row.post_id as string)

    return NextResponse.json({ postIds })
  } catch (error) {
    console.error('Error in /api/users/me/saved-ids:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

