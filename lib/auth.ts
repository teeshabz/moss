import { auth, currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from './supabase/admin'

/**
 * Get Clerk user id for the current request, or null if not signed in.
 */
export async function getUserId(): Promise<string | null> {
  const { userId } = await auth()
  return userId
}

/**
 * Get the current authenticated user from public.users (by Clerk user id).
 * Returns null if not signed in or no matching row.
 */
export async function getCurrentUser() {
  const userId = await getUserId()
  if (!userId) {
    return null
  }

  const supabase = createAdminClient()
  const { data: dbUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  return dbUser
}

/**
 * Require authentication - throws if user is not authenticated.
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

/**
 * Get Clerk session id for API routes (or null).
 */
export async function getSession(): Promise<{ sessionId: string } | null> {
  const { sessionId } = await auth()
  if (!sessionId) return null
  return { sessionId }
}

/**
 * Get Clerk user (auth identity only). Use getCurrentUser() for public.users row.
 */
export async function getClerkUser() {
  return currentUser()
}
