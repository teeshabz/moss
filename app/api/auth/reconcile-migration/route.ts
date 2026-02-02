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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/59875346-206d-4eaa-9b1d-4b3916768d08',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'reconcile-migration:entry',message:'reconcile POST called',data:{userId:userId ?? null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H5'})}).catch(()=>{});
    // #endregion
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clerkUser = await currentUser()
    const primaryEmail =
      clerkUser?.primaryEmailAddress?.emailAddress ??
      clerkUser?.emailAddresses?.[0]?.emailAddress ??
      ''
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/59875346-206d-4eaa-9b1d-4b3916768d08',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'reconcile-migration:afterClerk',message:'Clerk primary email',data:{primaryEmail:primaryEmail || '(empty)',hasClerkUser:!!clerkUser},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/59875346-206d-4eaa-9b1d-4b3916768d08',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'reconcile-migration:emailLookup',message:'Supabase row by email',data:{primaryEmail:primaryEmail.trim(),found:!!rowByEmail,rowId:rowByEmail?.id ?? null,emailLookupErr:emailLookupErr?.message ?? null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H4'})}).catch(()=>{});
    // #endregion

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

    await supabase.from('posts').update({ user_id: userId }).eq('user_id', oldId)
    await supabase.from('saves').update({ user_id: userId }).eq('user_id', oldId)
    const { error: deleteErr } = await supabase.from('users').delete().eq('id', oldId)
    if (deleteErr) {
      return NextResponse.json(
        { error: deleteErr.message, reconciled: false },
        { status: 500 }
      )
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/59875346-206d-4eaa-9b1d-4b3916768d08',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/reconcile-migration:POST',message:'reconciled migration id',data:{oldId,newId:userId,username:newRow.username},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

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
