import { createServerComponentClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/search/users?q=...
 * Search users by username. Requires auth. Returns { users: SearchUser[] }.
 * Limits to 3 results, excludes current user.
 */
export async function GET(request: Request) {
  try {
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

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()
    if (!q) {
      return NextResponse.json(
        { users: [] },
        { status: 200 }
      )
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, avatar_color')
      .ilike('username', `%${q}%`)
      .neq('id', authUser.id)
      .limit(3)

    if (error) {
      console.error('Error searching users:', error)
      return NextResponse.json(
        { error: 'Search failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({ users: users ?? [] })
  } catch (error) {
    console.error('Error in /api/search/users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
