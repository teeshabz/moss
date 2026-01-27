// Standalone connection test script
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Load .env.local manually
function loadEnv() {
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8')
    envContent.split('\n').forEach((line, index) => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        // Match KEY="value" or KEY=value format
        const match = trimmed.match(/^([^=]+)=(.*)$/)
        if (match) {
          const key = match[1].trim()
          let value = match[2].trim()
          // Remove surrounding quotes if present (handle both single and double quotes)
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
          }
          if (value) {
            process.env[key] = value
          }
        }
      }
    })
  } catch (error) {
    console.error('Error loading .env.local:', error.message)
  }
}

loadEnv()

async function testConnection() {
  const results = {
    timestamp: new Date().toISOString(),
    checks: {},
    errors: [],
  }

  // Check 1: Environment variables
  console.log('\n🔍 Checking environment variables...')
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

    console.log('  NEXT_PUBLIC_SUPABASE_URL:', hasUrl ? '✓' : '✗')
    console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY:', hasAnonKey ? '✓' : '✗')
    console.log('  SUPABASE_SERVICE_ROLE_KEY:', hasServiceKey ? '✓' : '✗')
    console.log('  DATABASE_URL:', hasDbUrl ? '✓' : '✗')

    if (!hasUrl || !hasAnonKey || !hasServiceKey || !hasDbUrl) {
      results.errors.push('Missing required environment variables')
      console.log('\n❌ Missing required environment variables')
      return results
    }
  } catch (error) {
    results.errors.push(`Env check failed: ${error}`)
    console.log('\n❌ Env check failed:', error)
    return results
  }

  // Check 2: Supabase client creation
  console.log('\n🔍 Testing Supabase client creation...')
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    results.checks.client = '✓ Created successfully'
    console.log('  ✓ Client created successfully')
  } catch (error) {
    results.errors.push(`Client creation failed: ${error}`)
    console.log('  ✗ Client creation failed:', error.message)
    return results
  }

  // Check 3: Database connection (test query)
  console.log('\n🔍 Testing database connection...')
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        results.checks.database = '✓ Connected (schema not set up yet - this is expected)'
        console.log('  ✓ Connected (schema not set up yet - this is expected)')
      } else {
        results.checks.database = `⚠ Connected but error: ${error.message}`
        results.errors.push(`Database query error: ${error.message}`)
        console.log('  ⚠ Connected but error:', error.message)
      }
    } else {
      results.checks.database = '✓ Connected and query successful'
      console.log('  ✓ Connected and query successful')
    }
  } catch (error) {
    results.checks.database = `✗ Connection failed: ${error.message}`
    results.errors.push(`Database connection failed: ${error}`)
    console.log('  ✗ Connection failed:', error.message)
  }

  // Check 4: Auth service connection
  console.log('\n🔍 Testing Auth service connection...')
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      results.checks.auth = `⚠ Auth service accessible but error: ${error.message}`
      console.log('  ⚠ Auth service accessible but error:', error.message)
    } else {
      results.checks.auth = '✓ Auth service connected (no active session - this is expected)'
      console.log('  ✓ Auth service connected (no active session - this is expected)')
    }
  } catch (error) {
    results.checks.auth = `✗ Auth connection failed: ${error.message}`
    results.errors.push(`Auth connection failed: ${error}`)
    console.log('  ✗ Auth connection failed:', error.message)
  }

  // Summary
  const hasErrors = results.errors.length > 0
  results.status = hasErrors ? 'partial' : 'success'
  results.summary = hasErrors
    ? 'Connection test completed with some issues'
    : 'All connection tests passed! ✓'

  console.log('\n' + '='.repeat(50))
  console.log('📊 SUMMARY:', results.summary)
  console.log('='.repeat(50))
  
  if (results.errors.length > 0) {
    console.log('\n⚠️  Errors:')
    results.errors.forEach(err => console.log('  -', err))
  }

  return results
}

// Run the test
testConnection()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
