import { getCurrentUser, requireUserId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { countWeeklyPosts } from '@/lib/api/weekly-limit'
import { recordSmsConsent } from '@/lib/sms-consent-record'
import type { UserMeResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/users/me
 * Returns current authenticated user and their weekly post count.
 * ?summary=1 skips saved post IDs for faster response (e.g. share page).
 */
export async function GET(request: Request) {
  try {
    const dbUser = await getCurrentUser()
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const supabaseAdmin = createAdminClient()
    const url = new URL(request.url)
    const summaryOnly = url.searchParams.get('summary') === '1'
    const userId = dbUser.id

    if (summaryOnly) {
      const weeklyPostCount = await countWeeklyPosts(userId, supabaseAdmin)
      const result: UserMeResponse = {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          username: dbUser.username,
          avatar_color: dbUser.avatar_color ?? '',
          phone_number: dbUser.phone_number ?? null,
          sms_opt_in: !!dbUser.sms_opt_in,
          last_weekly_sms_ping_at: dbUser.last_weekly_sms_ping_at ?? null,
          sms_timezone: dbUser.sms_timezone ?? null,
          first_name: dbUser.first_name ?? null,
          last_name: dbUser.last_name ?? null,
          created_at: dbUser.created_at,
        },
        weeklyPostCount,
      }
      return NextResponse.json(result)
    }

    const [weeklyPostCount, { data: saves }] = await Promise.all([
      countWeeklyPosts(userId, supabaseAdmin),
      supabaseAdmin.from('saves').select('post_id').eq('user_id', userId),
    ])

    const postIds = (saves ?? []).map((row) => row.post_id as string)

    const result: UserMeResponse = {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        username: dbUser.username,
        avatar_color: dbUser.avatar_color ?? '',
        phone_number: dbUser.phone_number ?? null,
        sms_opt_in: !!dbUser.sms_opt_in,
        last_weekly_sms_ping_at: dbUser.last_weekly_sms_ping_at ?? null,
        sms_timezone: dbUser.sms_timezone ?? null,
        first_name: dbUser.first_name ?? null,
        last_name: dbUser.last_name ?? null,
        created_at: dbUser.created_at,
      },
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
    const authResult = await requireUserId()
    if ('response' in authResult) {
      return authResult.response
    }
    const { userId } = authResult

    const body = await request.json().catch(() => ({}))
    const updates: {
      avatar_color?: string
      phone_number?: string | null
      sms_opt_in?: boolean
      sms_timezone?: string
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
    if (body.sms_opt_in !== undefined && typeof body.sms_opt_in === 'boolean') {
      updates.sms_opt_in = body.sms_opt_in
    }
    if (body.sms_timezone !== undefined && typeof body.sms_timezone === 'string') {
      const v = body.sms_timezone.trim()
      if (v) updates.sms_timezone = v
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

    let wasOptedIn = false
    if (updates.sms_opt_in === true) {
      const { data: before } = await supabaseAdmin
        .from('users')
        .select('sms_opt_in')
        .eq('id', userId)
        .single()
      wasOptedIn = !!before?.sms_opt_in
    }

    const { data: dbUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('id, email, username, avatar_color, phone_number, sms_opt_in, last_weekly_sms_ping_at, sms_timezone, first_name, last_name, created_at')
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

    if (updates.sms_opt_in === true && !wasOptedIn) {
      if (dbUser.phone_number) {
        dbUser.sms_opt_in = await recordSmsConsent(supabaseAdmin, userId, dbUser.phone_number, 'profile')
      } else {
        await supabaseAdmin.from('users').update({ sms_opt_in: false }).eq('id', userId)
        dbUser.sms_opt_in = false
      }
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
