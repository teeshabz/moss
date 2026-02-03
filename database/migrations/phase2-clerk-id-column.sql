-- Phase 2: Add clerk_id to users (internal id stays users.id)
-- Run in Supabase SQL Editor. Backup first.
-- After this, map Clerk users to Supabase users with: UPDATE users SET clerk_id = ? WHERE id = ?

-- 1. Add clerk_id column (nullable until you backfill per user)
ALTER TABLE users ADD COLUMN clerk_id text;

-- 2. Unique index so one Clerk user maps to at most one row (allows nulls)
CREATE UNIQUE INDEX users_clerk_id_key ON users(clerk_id) WHERE clerk_id IS NOT NULL;
