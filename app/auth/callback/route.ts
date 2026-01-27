import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { generateAvatarColor } from '@/lib/utils'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type') // 'signup' or 'login'
  const next = requestUrl.searchParams.get('next') || '/feed'

  if (!code) {
    return NextResponse.redirect(new URL('/login', requestUrl.origin))
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  // Exchange the code for a session
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('Error exchanging code for session:', exchangeError)
    return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
  }

  // Get the authenticated user
  const {
    data: { user: authUser },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !authUser) {
    console.error('Error getting user:', userError)
    return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
  }

  // Check if user exists in our public.users table
  const { data: dbUser, error: dbError } = await supabase
    .from('users')
    .select('id, username')
    .eq('id', authUser.id)
    .single()

  // Determine if this is signup confirmation or login
  const isSignupConfirmation = type === 'signup' || (dbError || !dbUser)

  if (isSignupConfirmation) {
    // SIGNUP CONFIRMATION FLOW
    // Get username from user metadata or try to get from auth user data
    let username = authUser.user_metadata?.username

    // If not in metadata, we'll need to handle this case
    // For now, we'll create the user with email as fallback
    if (!username) {
      // Try to extract from email (fallback)
      username = authUser.email?.split('@')[0] || 'user'
    }

    // Use service role key to create user in public.users table
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

    const avatarColor = generateAvatarColor()

    // Create user in public.users table
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.id,
        email: authUser.email!,
        username: username.toLowerCase(),
        avatar_color: avatarColor,
      })

    if (insertError) {
      console.error('Error creating user in public.users:', insertError)
      // If insert fails (e.g., username taken), redirect to login with error
      return NextResponse.redirect(
        new URL('/login?error=signup_failed', requestUrl.origin)
      )
    }

    // Clear session - log user out (they need to login separately)
    await supabase.auth.signOut()

    // Redirect to login page (not logged in, just email verified)
    return NextResponse.redirect(new URL('/login?verified=true', requestUrl.origin))
  } else {
    // LOGIN FLOW
    // User exists in public.users - this is a login
    // User is already authenticated from exchangeCodeForSession above
    // Redirect to feed (or the 'next' param if provided)
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }
}
