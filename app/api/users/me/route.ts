import { createServerComponentClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
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

    // Get user from public.users table
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('id, email, username, avatar_color, created_at')
      .eq('id', authUser.id)
      .single()

    if (dbError || !dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Use service role key to count weekly posts
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const weeklyPostCount = await countWeeklyPosts(authUser.id, supabaseAdmin)

    const response: UserMeResponse = {
      user: dbUser,
      weeklyPostCount,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in /api/users/me:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
