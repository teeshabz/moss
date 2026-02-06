import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from './supabase/admin'

/**
 * Get Clerk user id for the current request, or null if not signed in.
 * Use only where Clerk identity is needed (e.g. user create, reconcile).
 */
export async function getClerkUserId(): Promise<string | null> {
  const { userId } = await auth()
  return userId
}

export type RequireClerkUserIdResult =
  | { clerkUserId: string }
  | { response: NextResponse }

/**
 * Require Clerk authentication and return clerkUserId or a 401 response.
 */
export async function requireClerkUserId(): Promise<RequireClerkUserIdResult> {
  const clerkUserId = await getClerkUserId()
  if (!clerkUserId) {
    return {
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
    }
  }
  return { clerkUserId }
}

/**
 * Get internal user id (public.users.id) for the current request.
 * Resolves Clerk session → lookup users by clerk_id → return user.id.
 * Returns null if not signed in or no matching row in public.users.
 */
export async function getUserId(): Promise<string | null> {
  const clerkUserId = await getClerkUserId()
  if (!clerkUserId) {
    return null
  }

  const supabase = createAdminClient()
  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkUserId)
    .single()

  return dbUser?.id ?? null
}

export type RequireUserIdResult =
  | { userId: string }
  | { response: NextResponse }

/**
 * Require authenticated user and return internal userId or a 401 response.
 */
export async function requireUserId(): Promise<RequireUserIdResult> {
  const userId = await getUserId()
  if (!userId) {
    return {
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
    }
  }
  return { userId }
}

/**
 * Get the current authenticated user from public.users (by clerk_id).
 * Returns null if not signed in or no matching row.
 * Callers get internal user.id for DB operations.
 */
export async function getCurrentUser() {
  const clerkUserId = await getClerkUserId()
  if (!clerkUserId) {
    return null
  }

  const supabase = createAdminClient()
  const { data: dbUser } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', clerkUserId)
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
