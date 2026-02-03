import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 })
  }

  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    checks: {} as Record<string, string>,
    errors: [] as string[],
  }

  const checks = results.checks as Record<string, string>
  const errors = results.errors as string[]

  // Check 1: Environment variables (Supabase + Clerk)
  try {
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    const hasDbUrl = !!process.env.DATABASE_URL
    const hasClerkPk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    const hasClerkSecret = !!process.env.CLERK_SECRET_KEY

    checks.env = [
      hasSupabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL ✓' : 'NEXT_PUBLIC_SUPABASE_URL ✗',
      hasServiceKey ? 'SUPABASE_SERVICE_ROLE_KEY ✓' : 'SUPABASE_SERVICE_ROLE_KEY ✗',
      hasDbUrl ? 'DATABASE_URL ✓' : 'DATABASE_URL ✗',
      hasClerkPk ? 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ✓' : 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ✗',
      hasClerkSecret ? 'CLERK_SECRET_KEY ✓' : 'CLERK_SECRET_KEY ✗',
    ].join(', ')

    if (!hasSupabaseUrl || !hasServiceKey || !hasDbUrl) {
      errors.push('Missing required Supabase environment variables')
    }
    if (!hasClerkPk || !hasClerkSecret) {
      errors.push('Missing required Clerk environment variables')
    }
    if (errors.length > 0) {
      return NextResponse.json(results, { status: 500 })
    }
  } catch (error) {
    errors.push(`Env check failed: ${error}`)
    return NextResponse.json(results, { status: 500 })
  }

  // Check 2: Supabase admin client creation
  try {
    createAdminClient()
    checks.client = '✓ Admin client created successfully'
  } catch (error) {
    errors.push(`Client creation failed: ${error}`)
    return NextResponse.json(results, { status: 500 })
  }

  // Check 3: Database connection (test query via admin client)
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1)

    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        checks.database = '✓ Connected (schema not set up yet - this is expected)'
      } else {
        checks.database = `⚠ Connected but error: ${error.message}`
        errors.push(`Database query error: ${error.message}`)
      }
    } else {
      checks.database = '✓ Connected and query successful'
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    checks.database = `✗ Connection failed: ${msg}`
    errors.push(`Database connection failed: ${error}`)
  }

  // Check 4: Clerk (env only; no session check)
  checks.auth = '✓ Auth is Clerk (env checked above)'

  // Summary
  const hasErrors = errors.length > 0
  results.status = hasErrors ? 'partial' : 'success'
  results.summary = hasErrors
    ? 'Connection test completed with some issues'
    : 'All connection tests passed! ✓'

  return NextResponse.json(results, { status: 200 })
}
