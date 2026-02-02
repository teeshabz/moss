import { NextResponse } from 'next/server'

/**
 * Deprecated: Auth is now via Clerk. Sign-in/sign-up handle account existence.
 * Stub returns exists: false so legacy login UI does not attempt Supabase magic link.
 * Phase 3 will replace login/signup pages with Clerk components.
 */
export async function POST(_request: Request) {
  return NextResponse.json({
    exists: false,
    verified: false,
  })
}
