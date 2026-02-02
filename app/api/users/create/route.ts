import { auth, currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { generateAvatarColor } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/**
 * Create user in public.users table (id = Clerk user id).
 * Called after Clerk sign-up when the user has no row in public.users yet.
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const username = body.username

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()

    // Check if user already exists in public.users
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
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

    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email,
        username: username.toLowerCase().trim(),
        avatar_color: avatarColor,
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
