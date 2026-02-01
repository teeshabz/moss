import { startOfWeek, endOfWeek } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Maximum posts a user can create per week (America/New_York, Monday–Sunday). */
export const WEEKLY_POST_LIMIT = 3

/**
 * Calculate the start and end of the current week in America/New_York timezone
 * Week starts on Monday (ISO week)
 */
export function getCurrentWeekBounds(): { start: Date; end: Date } {
  const timezone = 'America/New_York'
  const now = new Date()
  
  // Convert current UTC time to New York timezone
  const nyTime = toZonedTime(now, timezone)
  
  // Get start of week (Monday) in NY timezone
  const weekStart = startOfWeek(nyTime, { weekStartsOn: 1 }) // 1 = Monday
  
  // Get end of week (Sunday) in NY timezone
  const weekEnd = endOfWeek(nyTime, { weekStartsOn: 1 })
  
  // Convert back to UTC for database queries
  const startUtc = fromZonedTime(weekStart, timezone)
  const endUtc = fromZonedTime(weekEnd, timezone)
  
  return {
    start: startUtc,
    end: endUtc,
  }
}

/**
 * Count user's posts in the current week (America/New_York timezone)
 * @param userId - User ID to count posts for
 * @param supabase - Supabase client (with service role key for admin access)
 */
export async function countWeeklyPosts(
  userId: string,
  supabase: SupabaseClient
): Promise<number> {
  const { start, end } = getCurrentWeekBounds()
  
  const { count, error } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
  
  if (error) {
    console.error('Error counting weekly posts:', error)
    throw error
  }
  
  return count || 0
}

/**
 * Check if user can create a post (hasn't reached weekly limit)
 */
export async function canCreatePost(
  userId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  const count = await countWeeklyPosts(userId, supabase)
  return count < WEEKLY_POST_LIMIT
}
