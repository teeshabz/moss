import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { countWeeklyPosts } from '@/lib/api/weekly-limit'
import type { UserMeResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/users/me
 * Returns current authenticated user and their weekly post count
 */
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabaseAdmin = createAdminClient()

    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('users')
      .select('id, email, username, avatar_color, phone_number, first_name, last_name, created_at')
      .eq('id', userId)
      .single()

    if (dbError || !dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const [weeklyPostCount, { data: saves }] = await Promise.all([
      countWeeklyPosts(userId, supabaseAdmin),
      supabaseAdmin.from('saves').select('post_id').eq('user_id', userId),
    ])

    const postIds = (saves ?? []).map((row) => row.post_id as string)

    const result: UserMeResponse = {
      user: dbUser,
      weeklyPostCount,
      postIds,
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

/**
 * PATCH /api/users/me
 * Update current user profile (avatar_color, phone_number, first_name, last_name only)
 */
export async function PATCH(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const updates: {
      avatar_color?: string
      phone_number?: string | null
      first_name?: string | null
      last_name?: string | null
    } = {}

    if (body.avatar_color !== undefined) {
      const v = typeof body.avatar_color === 'string' ? body.avatar_color.trim() : ''
      if (v) updates.avatar_color = v
    }
    if (body.phone_number !== undefined) {
      const v = typeof body.phone_number === 'string' ? body.phone_number.trim() : null
      updates.phone_number = v === '' ? null : v
    }
    if (body.first_name !== undefined) {
      const v = typeof body.first_name === 'string' ? body.first_name.trim() : null
      updates.first_name = v === '' ? null : v
    }
    if (body.last_name !== undefined) {
      const v = typeof body.last_name === 'string' ? body.last_name.trim() : null
      updates.last_name = v === '' ? null : v
    }

    const supabaseAdmin = createAdminClient()

    const { data: dbUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('id, email, username, avatar_color, phone_number, first_name, last_name, created_at')
      .single()

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json(
        { error: updateError.message || 'Failed to update user' },
        { status: 400 }
      )
    }

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user: dbUser })
  } catch (error) {
    console.error('Error in PATCH /api/users/me:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
