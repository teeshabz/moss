# Phase 1: Database and Identity Model (Clerk, start from scratch)

**Decisions locked:**
- **Identity:** `public.users.id` = Clerk user id (string, e.g. `user_2abc...`). No migration of existing Supabase users; start from scratch.
- **RLS:** Service role in API only. Remove or relax `auth.uid()`-based policies. API routes will use Supabase with the service role key and enforce "current user" in code (get `userId` from Clerk, filter all queries by it).

---

## 1. Schema changes

**File:** [database/schema.sql](database/schema.sql)

- **users table**
  - Keep `id TEXT PRIMARY KEY` but **drop the default** `gen_random_uuid()::text`. New rows will get `id = clerkUserId` from the app (no default).
  - Update the comment from "extends Supabase auth.users" to "id = Clerk user id".

- **No new columns.** `posts.user_id` and `saves.user_id` stay as `TEXT REFERENCES users(id)`; they will store Clerk user ids.

---

## 2. RLS changes

**File:** [database/schema.sql](database/schema.sql)

- **users**
  - Keep: `"Users are viewable by everyone"` FOR SELECT USING (true).
  - **Drop:** `"Users can update own row"` (auth.uid() will never be set). Updates will happen only from API routes using the service role; the route will verify the authenticated user (via Clerk) and only update that user's row.

- **saves**
  - **Drop:** `"Users can view their saves"`, `"Users can insert their saves"`, `"Users can delete their saves"` (all use auth.uid()).
  - Replace with policies that allow the **service role** to do everything, or with a single permissive policy for server-side use. Common approach: create a policy that allows full access when the request is from the backend (e.g. `true` for SELECT/INSERT/DELETE on saves), and rely on the API to only read/write the current user's saves. Supabase service role bypasses RLS by default, so if **all** API access to Supabase uses the admin client, you can either:
  - Leave RLS enabled with no restrictive policies (e.g. allow all for SELECT/INSERT/UPDATE/DELETE on saves), or
  - Use a policy like `USING (true)` for SELECT and `WITH CHECK (true)` for INSERT/UPDATE so the service role can do anything; authorization is enforced in the API layer.

- **posts**
  - Keep: `"Posts are viewable by everyone"` FOR SELECT.
  - No auth.uid() policy for INSERT/UPDATE/DELETE today; API will continue to enforce ownership (post belongs to current user).

**Concrete SQL (run in Supabase SQL Editor after backing up):**

```sql
-- Users: drop auth.uid()-based update policy
DROP POLICY IF EXISTS "Users can update own row" ON users;

-- Saves: drop auth.uid()-based policies
DROP POLICY IF EXISTS "Users can view their saves" ON saves;
DROP POLICY IF EXISTS "Users can insert their saves" ON saves;
DROP POLICY IF EXISTS "Users can delete their saves" ON saves;

-- Saves: allow all for service role (API enforces "current user" only)
CREATE POLICY "Service role full access to saves" ON saves
  FOR ALL USING (true) WITH CHECK (true);

-- Optional: same idea for users UPDATE if you want RLS to allow it
-- (API will still only update the row for the current Clerk user)
CREATE POLICY "Service role can update users" ON users
  FOR UPDATE USING (true) WITH CHECK (true);
```

(If you prefer not to add new policies and will use **only** the service role for writes, note that the service role **bypasses RLS**. So dropping the auth.uid() policies and adding no new ones means: anon key cannot do anything to saves/users; service role can do everything. So you only need to drop the old policies. The "Service role full access" policies above are only needed if you ever use a non–service-role client for those tables. For Phase 1, **dropping** the auth.uid() policies is enough; the admin client bypasses RLS.)

**Simpler option (recommended):** Just drop the auth.uid() policies. Do **not** create new permissive policies. All API routes will use `createAdminClient()` (service role), which bypasses RLS. So:

```sql
DROP POLICY IF EXISTS "Users can update own row" ON users;
DROP POLICY IF EXISTS "Users can view their saves" ON saves;
DROP POLICY IF EXISTS "Users can insert their saves" ON saves;
DROP POLICY IF EXISTS "Users can delete their saves" ON saves;
```

---

## 3. Data reset (start from scratch)

To clear existing Supabase-auth users and their data so the app starts clean with Clerk-only ids:

**Order matters (foreign keys):** saves → posts → users.

```sql
-- Optional: clear existing user data (run in Supabase SQL Editor)
TRUNCATE saves, posts, users RESTART IDENTITY CASCADE;
```

If you have data in `media_items` that is not referenced by any post, you can leave it. If you want to wipe everything:

```sql
TRUNCATE saves, posts, users, media_items RESTART IDENTITY CASCADE;
```

Run only if you are sure you do not need existing users or their posts/saves.

---

## 4. Schema doc / comments

- In [database/schema.sql](database/schema.sql), update the top comment and the `users` table comment to state that `users.id` is the Clerk user id and that RLS no longer uses auth.uid(); the API uses the service role and enforces "current user" in application code.

---

## 5. What Phase 1 does *not* do

- No code changes to the app yet (no Clerk, no API changes).
- No changes to [lib/supabase/admin.ts](lib/supabase/admin.ts), [lib/auth.ts](lib/auth.ts), or any API route.
- Phase 2 will switch the app to Clerk and use the service role in API routes with `userId` from Clerk.

---

## Checklist

- [ ] Backup Supabase DB (or confirm you are okay truncating).
- [x] In [database/schema.sql](database/schema.sql): remove default on `users.id`, update comments for users and RLS.
- [ ] **Existing DB only:** Run [database/migrations/phase1-clerk-rls.sql](database/migrations/phase1-clerk-rls.sql) in Supabase SQL Editor (drops default on `users.id` and the four auth.uid() policies).
- [ ] (Optional) Run `TRUNCATE saves, posts, users RESTART IDENTITY CASCADE;` to start from scratch.
- [ ] Confirm no RLS policies still reference `auth.uid()`.

After this, the database is ready for Phase 2: auth structure (Clerk + API routes using service role and Clerk `userId`).
