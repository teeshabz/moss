import { auth, currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from './supabase/admin'

/**
 * Get Clerk user id for the current request, or null if not signed in.
 */
export async function getUserId(): Promise<string | null> {
  const { userId } = await auth()
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/59875346-206d-4eaa-9b1d-4b3916768d08',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:getUserId',message:'auth() result',data:{userId:userId ?? null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2,H5'})}).catch(()=>{});
  // #endregion
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
  const { data: dbUser, error: dbError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/59875346-206d-4eaa-9b1d-4b3916768d08',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth.ts:getCurrentUser',message:'Supabase lookup by userId',data:{userId,found:!!dbUser,dbUserId:dbUser?.id ?? null,dbErrorCode:dbError?.code ?? null,dbErrorMsg:dbError?.message ?? null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H3,H4'})}).catch(()=>{});
  // #endregion

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
