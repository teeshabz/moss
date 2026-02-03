import { auth, currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/reconcile-migration
 * One-time fix: if the signed-in Clerk user has no row in public.users, look up
 * by primary email. If a row exists with a different id (migration wrote wrong id),
 * repoint that row to the current Clerk userId so the user is recognized.
 */
export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clerkUser = await currentUser()
    const primaryEmail =
      clerkUser?.primaryEmailAddress?.emailAddress ??
      clerkUser?.emailAddresses?.[0]?.emailAddress ??
      ''
    if (!primaryEmail) {
      return NextResponse.json(
        { error: 'No email on Clerk user', reconciled: false },
        { status: 200 }
      )
    }

    const supabase = createAdminClient()

    const { data: existingByUserId } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (existingByUserId) {
      return NextResponse.json(
        { reconciled: false, user: existingByUserId },
        { status: 200 }
      )
    }

    const { data: rowByEmail, error: emailLookupErr } = await supabase
      .from('users')
      .select('id, email, username, avatar_color, phone_number, first_name, last_name, created_at')
      .ilike('email', primaryEmail.trim())
      .maybeSingle()

    if (!rowByEmail || rowByEmail.id === userId) {
      return NextResponse.json({ reconciled: false }, { status: 200 })
    }

    const oldId = rowByEmail.id
    const newRow = {
      id: userId,
      email: rowByEmail.email,
      username: rowByEmail.username,
      avatar_color: rowByEmail.avatar_color,
      phone_number: rowByEmail.phone_number,
      first_name: rowByEmail.first_name,
      last_name: rowByEmail.last_name,
      created_at: rowByEmail.created_at,
    }

    const { error: insertErr } = await supabase.from('users').insert(newRow)
    if (insertErr) {
      return NextResponse.json(
        { error: insertErr.message, reconciled: false },
        { status: 500 }
      )
    }

    const { error: updatePostsErr } = await supabase.from('posts').update({ user_id: userId }).eq('user_id', oldId)
    if (updatePostsErr) {
      return NextResponse.json(
        { error: updatePostsErr.message, reconciled: false },
        { status: 500 }
      )
    }

    const { error: updateSavesErr } = await supabase.from('saves').update({ user_id: userId }).eq('user_id', oldId)
    if (updateSavesErr) {
      return NextResponse.json(
        { error: updateSavesErr.message, reconciled: false },
        { status: 500 }
      )
    }

    const { error: deleteErr } = await supabase.from('users').delete().eq('id', oldId)
    if (deleteErr) {
      return NextResponse.json(
        { error: deleteErr.message, reconciled: false },
        { status: 500 }
      )
    }

    return NextResponse.json({
      reconciled: true,
      user: newRow,
    })
  } catch (err) {
    console.error('Error in reconcile-migration:', err)
    return NextResponse.json(
      { error: 'Internal server error', reconciled: false },
      { status: 500 }
    )
  }
}
