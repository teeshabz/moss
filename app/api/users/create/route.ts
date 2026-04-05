import { currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireClerkUserId } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { generateAvatarColor, normalizeProfilePhoneToE164 } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/**
 * Create user in public.users table (internal id + clerk_id).
 * Called after Clerk sign-up when the user has no row in public.users yet.
 */
export async function POST(request: Request) {
  try {
    const authResult = await requireClerkUserId()
    if ('response' in authResult) {
      return authResult.response
    }
    const { clerkUserId } = authResult

    const body = await request.json().catch(() => ({}))
    const username = body.username
    const phoneRaw =
      typeof body.phone_number === 'string' ? body.phone_number : ''
    const phoneE164 = normalizeProfilePhoneToE164(phoneRaw)

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    if (!phoneE164) {
      return NextResponse.json(
        { error: 'A valid phone number is required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()

    // Check if user already exists in public.users (by clerk_id)
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_id', clerkUserId)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { message: 'User already exists', user: existingUser },
        { status: 200 }
      )
    }

    const clerkUser = await currentUser()
    const email =
      clerkUser?.primaryEmailAddress?.emailAddress ??
      clerkUser?.emailAddresses?.[0]?.emailAddress ??
      ''

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required to create user' },
        { status: 400 }
      )
    }

    const avatarColor = generateAvatarColor()
    const internalId = crypto.randomUUID()

    const firstName =
      typeof body.first_name === 'string' && body.first_name.trim()
        ? body.first_name.trim()
        : null
    const lastName =
      typeof body.last_name === 'string' && body.last_name.trim()
        ? body.last_name.trim()
        : null

    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: internalId,
        clerk_id: clerkUserId,
        email,
        username: username.toLowerCase().trim(),
        avatar_color: avatarColor,
        phone_number: phoneE164,
        first_name: firstName,
        last_name: lastName,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating user in public.users:', insertError)
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'User created successfully', user: newUser },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in create user route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
