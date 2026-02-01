import { createServerComponentClient } from './supabase/server'

/**
 * Get Supabase client for database queries
 * Use this in Server Components and API routes
 */
export async function getSupabaseClient() {
  return await createServerComponentClient()
}
