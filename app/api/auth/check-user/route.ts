import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

/**
 * Check if a user exists in Supabase auth and if their email is verified
 * Uses service role key to query auth.users table
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Use service role key to access auth.users table
    const supabaseAdmin = createAdminClient()

    // Query auth.users table via Admin API
    // Note: Admin API doesn't have getUserByEmail, so we list and filter
    // For production, consider using a database function for better performance
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers()

    if (error) {
      console.error('Error checking user existence:', error)
      return NextResponse.json(
        { error: 'Failed to check user existence' },
        { status: 500 }
      )
    }

    // Find user by email (case-insensitive)
    const user = users.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    )

    if (!user) {
      return NextResponse.json({
        exists: false,
        verified: false,
      })
    }

    return NextResponse.json({
      exists: true,
      verified: user.email_confirmed_at !== null,
    })
  } catch (error) {
    console.error('Error in check-user route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
