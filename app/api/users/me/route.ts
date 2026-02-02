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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/59875346-206d-4eaa-9b1d-4b3916768d08',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/users/me/route.ts:GET',message:'auth() and DB lookup',data:{userId:userId ?? null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2,H5'})}).catch(()=>{});
    // #endregion
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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/59875346-206d-4eaa-9b1d-4b3916768d08',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/users/me/route.ts:GET:afterSelect',message:'Supabase users lookup result',data:{userId,found:!!dbUser,dbErrorCode:dbError?.code ?? null,dbErrorMsg:dbError?.message ?? null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H3,H4'})}).catch(()=>{});
    // #endregion

    if (dbError || !dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const weeklyPostCount = await countWeeklyPosts(userId, supabaseAdmin)

    const result: UserMeResponse = {
      user: dbUser,
      weeklyPostCount,
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
