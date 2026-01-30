import { unstable_cache } from 'next/cache'
import { createServerComponentClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { countWeeklyPosts } from '@/lib/api/weekly-limit'
import type { UserMeResponse } from '@/lib/types'

/**
 * GET /api/users/me
 * Returns current authenticated user and their weekly post count
 */
export async function GET() {
  try {
    // Get authenticated user
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

    const result = await unstable_cache(
      async () => {
        const supabase = await createServerComponentClient()
        const { data: dbUser, error: dbError } = await supabase
          .from('users')
          .select('id, email, username, avatar_color, created_at')
          .eq('id', authUser.id)
          .single()

        if (dbError || !dbUser) {
          return { notFound: true } as const
        }

        const supabaseAdmin = createAdminClient()
        const weeklyPostCount = await countWeeklyPosts(authUser.id, supabaseAdmin)

        return {
          user: dbUser,
          weeklyPostCount,
        } satisfies UserMeResponse
      },
      ['user-me', authUser.id],
      { revalidate: 60 }
    )

    if ('notFound' in result && result.notFound) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in /api/users/me:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
