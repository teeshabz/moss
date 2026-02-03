import { getUserId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/search/users?q=...
 * Search users by username. Requires auth. Returns { users: SearchUser[] }.
 * Limits to 3 results, excludes current user.
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserId()
    if (!userId) {
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

    const supabase = createAdminClient()

    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, avatar_color')
      .ilike('username', `%${q}%`)
      .neq('id', userId)
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
