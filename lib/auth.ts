import { createServerComponentClient } from './supabase/server'

/**
 * Get the current authenticated user from Supabase
 */
export async function getCurrentUser() {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get user from our custom users table
  const { data: dbUser } = await supabase
    .from('users')
    .select('*')
    .eq('email', user.email!)
    .single()

  return dbUser
}

/**
 * Require authentication - throws if user is not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

/**
 * Get Supabase session for API routes
 */
export async function getSession() {
  const supabase = await createServerComponentClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
}

/**
 * Get Supabase user (from auth.users table)
 */
export async function getSupabaseUser() {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
