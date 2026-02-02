/**
 * One-off migration: map existing Supabase users (old id) to Clerk user ids,
 * then update Supabase so public.users.id = Clerk user id for each person.
 *
 * Prerequisites:
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
  avatar_color: string | null
  phone_number: string | null
  first_name: string | null
  last_name: string | null
  created_at: string
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

async function main() {
  console.log('=== Clerk user migration ===')
  console.log('Ensure you have backed up your database (Supabase → Backups or export users/posts/saves) before continuing.')
  console.log('')

  // 1. Fetch all Supabase users (old ids)
  const { data: supabaseUsers, error: selectError } = await supabase
    .from('users')
    .select('id, email, username, avatar_color, phone_number, first_name, last_name, created_at')

  if (selectError) {
    console.error('Failed to fetch Supabase users:', selectError.message)
    process.exit(1)
  }

  if (!supabaseUsers?.length) {
    console.log('No users in Supabase. Nothing to migrate.')
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

  // 3. Build mapping old_id -> clerk_id (create Clerk user if not found)
  const mapping: { oldId: string; clerkId: string }[] = []
  for (const row of supabaseUsers as SupabaseUser[]) {
    const emailNorm = normalizeEmail(row.email)
    let clerkId = clerkEmailToId.get(emailNorm)
    if (!clerkId) {
      try {
        const created = await clerk.users.createUser({
          emailAddress: [row.email],
          firstName: row.first_name ?? undefined,
          lastName: row.last_name ?? undefined,
          username: row.username || undefined,
        })
        clerkId = created.id
        clerkEmailToId.set(emailNorm, clerkId)
        console.log(`Created Clerk user for ${row.email} -> ${clerkId}`)
      } catch (err) {
        console.error(`Failed to create Clerk user for ${row.email}:`, err)
        process.exit(1)
      }
    }
    mapping.push({ oldId: row.id, clerkId })
  }

  console.log('')
  console.log('Mapping (old_id -> clerk_id):')
  mapping.forEach(({ oldId, clerkId }) => console.log(`  ${oldId} -> ${clerkId}`))
  console.log('')

  // 4. For each (old_id, clerk_id): INSERT new user row, UPDATE posts/saves, DELETE old row
  for (const { oldId, clerkId } of mapping) {
    const { data: row, error: getErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', oldId)
      .single()

    if (getErr || !row) {
      console.error(`Could not load user ${oldId}:`, getErr?.message)
      continue
    }

    const newRow = {
      id: clerkId,
      email: row.email,
      username: row.username,
      avatar_color: row.avatar_color,
      phone_number: row.phone_number,
      first_name: row.first_name,
      last_name: row.last_name,
      created_at: row.created_at,
    }

    const { error: insertErr } = await supabase.from('users').insert(newRow)
    if (insertErr) {
      if (insertErr.code === '23505') {
        console.log(`User ${clerkId} already exists (skipping insert), updating refs and deleting old.`)
      } else {
        console.error(`Insert failed for ${oldId} -> ${clerkId}:`, insertErr.message)
        continue
      }
    }

    const { error: updatePostsErr } = await supabase.from('posts').update({ user_id: clerkId }).eq('user_id', oldId)
    if (updatePostsErr) {
      console.error(`Update posts failed for ${oldId}:`, updatePostsErr.message)
      continue
    }

    const { error: updateSavesErr } = await supabase.from('saves').update({ user_id: clerkId }).eq('user_id', oldId)
    if (updateSavesErr) {
      console.error(`Update saves failed for ${oldId}:`, updateSavesErr.message)
      continue
    }

    const { error: deleteErr } = await supabase.from('users').delete().eq('id', oldId)
    if (deleteErr) {
      console.error(`Delete old user ${oldId} failed:`, deleteErr.message)
      continue
    }

    console.log(`Migrated ${oldId} -> ${clerkId}`)
  }

  console.log('')
  console.log('Migration complete. Verify by signing in with Clerk (same email) and checking profile, posts, saves.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
