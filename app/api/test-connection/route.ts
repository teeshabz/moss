import { createServerComponentClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    checks: {},
    errors: [],
  }

  // Check 1: Environment variables
  try {
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    const hasDbUrl = !!process.env.DATABASE_URL

    results.checks.env = {
      NEXT_PUBLIC_SUPABASE_URL: hasUrl ? '✓ Set' : '✗ Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: hasAnonKey ? '✓ Set' : '✗ Missing',
      SUPABASE_SERVICE_ROLE_KEY: hasServiceKey ? '✓ Set' : '✗ Missing',
      DATABASE_URL: hasDbUrl ? '✓ Set' : '✗ Missing',
    }

    if (!hasUrl || !hasAnonKey || !hasServiceKey || !hasDbUrl) {
      results.errors.push('Missing required environment variables')
      return NextResponse.json(results, { status: 500 })
    }
  } catch (error) {
    results.errors.push(`Env check failed: ${error}`)
    return NextResponse.json(results, { status: 500 })
  }

  // Check 2: Supabase client creation
  try {
    const supabase = await createServerComponentClient()
    results.checks.client = '✓ Created successfully'
  } catch (error) {
    results.errors.push(`Client creation failed: ${error}`)
    return NextResponse.json(results, { status: 500 })
  }

  // Check 3: Database connection (test query)
  try {
    const supabase = await createServerComponentClient()
    // Try a simple query - this will fail if tables don't exist yet, but connection should work
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (error) {
      // If it's a "relation does not exist" error, connection is working but schema isn't set up
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        results.checks.database = '✓ Connected (schema not set up yet - this is expected)'
      } else {
        results.checks.database = `⚠ Connected but error: ${error.message}`
        results.errors.push(`Database query error: ${error.message}`)
      }
    } else {
      results.checks.database = '✓ Connected and query successful'
    }
  } catch (error: any) {
    results.checks.database = `✗ Connection failed: ${error.message}`
    results.errors.push(`Database connection failed: ${error}`)
  }

  // Check 4: Auth service connection
  try {
    const supabase = await createServerComponentClient()
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      results.checks.auth = `⚠ Auth service accessible but error: ${error.message}`
    } else {
      results.checks.auth = '✓ Auth service connected (no active session - this is expected)'
    }
  } catch (error: any) {
    results.checks.auth = `✗ Auth connection failed: ${error.message}`
    results.errors.push(`Auth connection failed: ${error}`)
  }

  // Summary
  const hasErrors = results.errors.length > 0
  results.status = hasErrors ? 'partial' : 'success'
  results.summary = hasErrors
    ? 'Connection test completed with some issues'
    : 'All connection tests passed! ✓'

  return NextResponse.json(results, { status: hasErrors ? 200 : 200 })
}
