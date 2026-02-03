# Clerk ↔ Supabase migration status

**Last updated:** Pick-up reference for continuing the two-ID (auth vs DB) migration.  
**Goal:** Two IDs — Clerk ID for auth, internal `users.id` for DB. Same Supabase DB used by both Clerk dev and prod.

---

## 1. Current state (as of now)

### Supabase DB (rolled back)

- **`users.id`** = general / internal IDs (e.g. from Supabase Auth or your own UUIDs). **Not** Clerk user IDs.
- **`posts.user_id`** and **`saves.user_id`** reference `users.id` (internal).
- **No `clerk_id` column** on `users` yet — unless you have already run the Phase 2 migration below.

So: DB is in “internal ID” shape. Any code that assumes `users.id` = Clerk ID will not find users.

### Clerk

- **Dev** and **Prod** are both set up and working.
- **Both** use the **same** Supabase project (same DB) via your env (e.g. `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`).
- Dev and prod have **different** Clerk user IDs for the same person (different Clerk instances).

### Code (two-ID deployed)

- **Two-ID behavior (deployed):**  
  - **Migration:** `database/migrations/phase2-clerk-id-column.sql` — adds `users.clerk_id` (text, unique, nullable).  
  - **Auth layer:** `lib/auth.ts` — `getClerkUserId()`, `getUserId()` = internal id via lookup by `clerk_id`, `getCurrentUser()` by `clerk_id`.  
  - **API routes:** All relevant routes use internal id from `getUserId()` or `getCurrentUser()`; user create uses `getClerkUserId()` and inserts `clerk_id` + new internal `id`.  
  - **Reconcile:** `app/api/auth/reconcile-migration/route.ts` — backfill `clerk_id` only: `UPDATE users SET clerk_id = ? WHERE id = ?` (by email).  
  - **Feed 401:** `app/feed/page.tsx` — on 401 from feed (or saved) API, redirect to `/onboarding` instead of `/login`.



---

## 2. Target: two IDs

| Concept        | Where it lives              | Purpose |
|----------------|-----------------------------|--------|
| **Clerk ID**   | `users.clerk_id`            | Auth; links session to a row. Can differ per env (dev vs prod). |
| **Internal ID**| `users.id` (PK)             | Stable DB identity; `posts.user_id`, `saves.user_id` reference this. |

- Resolve user: Clerk ID → lookup `users` by `clerk_id` → use `user.id` (internal) for all DB reads/writes.
- New sign-ups: insert row with `id` = new UUID (or default), `clerk_id` = Clerk user ID.
- Existing users: map once per env with `UPDATE users SET clerk_id = ? WHERE id = ?`.

---

## 3. What exists in the repo (for two-ID)

### 3.1 Supabase migration (Phase 2)

**File:** `database/migrations/phase2-clerk-id-column.sql`

- Adds `users.clerk_id` (text, nullable).
- Creates unique partial index on `clerk_id` (allows nulls).
- No change to `users.id`, `posts`, or `saves`.

**To apply:** Run this script in the Supabase SQL Editor (same project used by dev and prod). Backup first if you care.

### 3.2 Plan document

**File:** `.cursor/plans/stable_internal_user_id_1469ef6e.plan.md` (or equivalent in your plans folder)

- Full step-by-step: add `clerk_id`, auth layer, API routes, reconcile, your mapping step.
- Order: run Phase 2 migration → deploy two-ID code → map Clerk users to Supabase (`clerk_id`).

### 3.3 Other docs

- `docs/MIGRATION-USER-CHECKLIST.md` — written for one-ID / reconcile; still useful for “Clerk user ↔ Supabase row” checks.
- `docs/CLERK-PROD-FIX.md` — prod Clerk setup (proxy, domains, etc.).
- `PHASE1-DATABASE-PLAN.md` — earlier Clerk/RLS phase.

---

## 4. Porting “current DB state” to prod

You said dev and prod **both use the same Supabase DB**. So:

- There is **no separate “prod DB” to port to** — there’s one DB. “Port current DB state to prod” then means: **make prod app work with this same DB and two-ID design.**

Concrete steps:

1. **DB (once):**  
   Run `phase2-clerk-id-column.sql` in Supabase (if not already).  
   Result: `users.clerk_id` exists; `users.id` stays internal.

2. **Code:**  
   Deploy the **two-ID** code (the uncommitted work above): auth layer, all API routes, reconcile, feed redirect to onboarding.  
   So: commit and deploy that work, or re-apply it and then deploy.

3. **Mapping:**  
   For each existing Supabase user you want to use in **prod**:  
   - Create (or identify) the corresponding user in **Clerk Prod**.  
   - Run: `UPDATE users SET clerk_id = '<clerk_prod_user_id>' WHERE id = '<supabase_internal_id>';`  
   Same idea for **dev**: use Clerk Dev user IDs and set `clerk_id` for dev testing.  
   One row can only have one `clerk_id`; typically you set prod’s Clerk ID when going live and use reconcile or a one-time script when switching envs if needed.

4. **Reconcile (optional):**  
   If someone signs in in prod and has a row by email but no `clerk_id` yet, the two-ID reconcile endpoint can set `clerk_id` for that row so they don’t need a manual UPDATE.

---

## 5. Order of operations when you pick this up

1. **Confirm DB:**  
   - `users.id` = internal IDs.  
   - If no `clerk_id` column, run `database/migrations/phase2-clerk-id-column.sql`.

2. **Confirm code:**  
   - Either restore/apply the two-ID changes (auth, routes, reconcile, feed redirect) and commit, or keep them in a branch and deploy that branch.

3. **Deploy** the two-ID app (so it uses `getUserId()` = internal id, `getClerkUserId()` where needed, and `clerk_id` for lookups).

4. **Map users:**  
   - Dev: create/link Clerk Dev users, set `clerk_id` for test rows.  
   - Prod: create/link Clerk Prod users, set `clerk_id` for live rows (or use reconcile on first sign-in).

5. **Smoke-test:**  
   Sign in (dev and prod), go to feed, create post, save, profile — confirm APIs use internal id and `clerk_id` correctly.

---

## 6. Quick reference: key files (two-ID design)

| Area        | File(s) |
|------------|---------|
| Migration  | `database/migrations/phase2-clerk-id-column.sql` |
| Auth       | `lib/auth.ts` — `getClerkUserId()`, `getUserId()` (internal), `getCurrentUser()` by `clerk_id` |
| User create| `app/api/users/create/route.ts` — insert with `clerk_id` + new internal `id` |
| Reconcile  | `app/api/auth/reconcile-migration/route.ts` — update `clerk_id` by email |
| Routes     | All API routes that need “current user” use internal id from `getUserId()` or `getCurrentUser().id` |
| Feed 401   | `app/feed/page.tsx` — redirect to `/onboarding` on 401 |

---

## 7. Summary

- **DB:** Internal `users.id`; `users.clerk_id` added via Phase 2 migration.
- **Clerk:** Dev + prod both working; same Supabase DB.
- **Code:** Two-ID deployed — `getUserId()` returns internal id; `getClerkUserId()` for user create/reconcile; feed 401 → `/onboarding`.
- **To “port current DB to prod”:** Use the one DB; run Phase 2 if not already; deploy two-ID code; set `clerk_id` for prod (and dev) users via script or reconcile; then prod and dev both run against the same DB with two-ID semantics.
