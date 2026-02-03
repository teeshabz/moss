/**
 * Two-ID migration: backfill users.clerk_id only.
 * For each Supabase user (by internal id), find or create Clerk user by email,
 * then UPDATE users SET clerk_id = clerkId WHERE id = internalId.
 * No row replacement, no changes to posts or saves.
 *
 * Prerequisites:
 * - Phase 2 migration applied: users.clerk_id column exists.
 * - Back up your database (Supabase Dashboard → Backups or export users/posts/saves).
 * - Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLERK_SECRET_KEY
 *
 * Run from project root: npx tsx scripts/migrate-users-to-clerk.ts
 * Or: node --env-file=.env.local --import tsx scripts/migrate-users-to-clerk.ts
 */

import { createClerkClient } from '@clerk/backend'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load .env.local if present
function loadEnvLocal() {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      for (const line of content.split('\n')) {
        const match = line.match(/^([^#=]+)=(.*)$/)
        if (match) {
          const key = match[1].trim()
          const value = match[2].trim().replace(/^["']|["']$/g, '')
          if (!process.env[key]) process.env[key] = value
        }
      }
    }
  } catch {
    // ignore
  }
}

loadEnvLocal()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const clerkSecretKey = process.env.CLERK_SECRET_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!clerkSecretKey) {
  console.error('Missing CLERK_SECRET_KEY')
  process.exit(1)
}

const clerk = createClerkClient({ secretKey: clerkSecretKey })
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type SupabaseUser = {
  id: string
  email: string
  username: string
  clerk_id: string | null
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

async function main() {
  console.log('=== Two-ID: backfill users.clerk_id ===')
  console.log('Ensure you have backed up your database (Supabase → Backups or export users/posts/saves) before continuing.')
  console.log('')

  // 1. Fetch all Supabase users (internal id, email, clerk_id)
  const { data: supabaseUsers, error: selectError } = await supabase
    .from('users')
    .select('id, email, username, clerk_id')

  if (selectError) {
    console.error('Failed to fetch Supabase users:', selectError.message)
    process.exit(1)
  }

  if (!supabaseUsers?.length) {
    console.log('No users in Supabase. Nothing to do.')
    return
  }

  // Check for duplicate emails in Supabase
  const emails = supabaseUsers.map((u) => normalizeEmail(u.email))
  const seen = new Set<string>()
  for (const e of emails) {
    if (seen.has(e)) {
      console.error('Duplicate email in Supabase users:', e)
      process.exit(1)
    }
    seen.add(e)
  }

  console.log(`Found ${supabaseUsers.length} Supabase user(s).`)

  // 2. Fetch all Clerk users (paginated) and index by primary email
  const clerkEmailToId = new Map<string, string>()
  let offset = 0
  const limit = 100
  while (true) {
    const res = await clerk.users.getUserList({ limit, offset })
    const list = res.data ?? []
    for (const user of list) {
      const primary = user.primaryEmailAddress
      if (primary?.emailAddress) {
        clerkEmailToId.set(normalizeEmail(primary.emailAddress), user.id)
      }
    }
    if (list.length < limit) break
    offset += limit
  }
  console.log(`Found ${clerkEmailToId.size} Clerk user(s) by email.`)

  // 3. For each Supabase user: find or create Clerk user, then UPDATE users SET clerk_id = ? WHERE id = ?
  for (const row of supabaseUsers as SupabaseUser[]) {
    const internalId = row.id
    const emailNorm = normalizeEmail(row.email)

    if (row.clerk_id) {
      console.log(`User ${internalId} already has clerk_id, skipping.`)
      continue
    }

    let clerkId = clerkEmailToId.get(emailNorm)
    if (!clerkId) {
      try {
        const created = await clerk.users.createUser({
          emailAddress: [row.email],
          firstName: undefined,
          lastName: undefined,
          username: row.username || undefined,
        })
        clerkId = created.id
        clerkEmailToId.set(emailNorm, clerkId)
        console.log(`Created Clerk user for ${row.email} -> ${clerkId}`)
      } catch (err) {
        console.error(`Failed to create Clerk user for ${row.email}:`, err)
        continue
      }
    }

    const { error: updateErr } = await supabase
      .from('users')
      .update({ clerk_id: clerkId })
      .eq('id', internalId)

    if (updateErr) {
      console.error(`Update clerk_id failed for ${internalId}:`, updateErr.message)
      continue
    }

    console.log(`Backfilled clerk_id for ${internalId} (${row.email})`)
  }

  console.log('')
  console.log('Backfill complete. Verify by signing in with Clerk (same email) and checking profile, posts, saves.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
