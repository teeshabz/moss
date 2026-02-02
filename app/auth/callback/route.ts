import { NextResponse } from 'next/server'
import { sanitizeRedirectPath } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/**
 * Auth redirect (Clerk). No Supabase code exchange.
 * Clerk handles sign-in/sign-up redirects via dashboard URLs (e.g. afterSignInUrl).
 * This route exists so /auth/callback remains a valid public path; redirects to feed or ?next=.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const next = sanitizeRedirectPath(requestUrl.searchParams.get('next'))
  const destination = next || '/feed'
  return NextResponse.redirect(new URL(destination, requestUrl.origin))
}
