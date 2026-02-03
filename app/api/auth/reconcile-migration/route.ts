import { auth, currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/reconcile-migration
 * Backfill clerk_id only: if the signed-in Clerk user has no row in public.users
 * by clerk_id, look up by primary email. If a row exists without this clerk_id,
 * set clerk_id so the user is recognized. No row replacement.
 */
export async function POST() {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
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

    // Already linked by clerk_id
    const { data: existingByClerkId } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkUserId)
      .single()

    if (existingByClerkId) {
      return NextResponse.json(
        { reconciled: false, user: existingByClerkId },
        { status: 200 }
      )
    }

    // Find row by email (case-insensitive)
    const { data: rowByEmail } = await supabase
      .from('users')
      .select('id, clerk_id')
      .ilike('email', primaryEmail.trim())
      .maybeSingle()

    if (!rowByEmail) {
      return NextResponse.json({ reconciled: false }, { status: 200 })
    }
    if (rowByEmail.clerk_id === clerkUserId) {
      return NextResponse.json({ reconciled: false }, { status: 200 })
    }

    // Backfill clerk_id only
    const { error: updateErr } = await supabase
      .from('users')
      .update({ clerk_id: clerkUserId })
      .eq('id', rowByEmail.id)

    if (updateErr) {
      return NextResponse.json(
        { error: updateErr.message, reconciled: false },
        { status: 500 }
      )
    }

    return NextResponse.json({
      reconciled: true,
      user: { id: rowByEmail.id },
    })
  } catch (err) {
    console.error('Error in reconcile-migration:', err)
    return NextResponse.json(
      { error: 'Internal server error', reconciled: false },
      { status: 500 }
    )
  }
}
