# Clerk Migration – State & Reference

Reference doc for where we are with the Clerk migration and what we’ve discussed for later.

---

## Current State (Done)

### Phase 1: Database & Identity
- **Identity:** `public.users.id` = Clerk user id (e.g. `user_2abc...`). Set by the app on insert; no default in DB.
- **RLS:** No `auth.uid()` policies. API uses Supabase **service role** and enforces “current user” in code (Clerk `userId`).
- **Migration SQL:** [database/migrations/phase1-clerk-rls.sql](database/migrations/phase1-clerk-rls.sql) – drop default on `users.id`, drop auth.uid()-based policies on `users` and `saves`. Run in Supabase SQL Editor after backup.

### Phase 2: Auth Structure (Backend / API)
- **Clerk:** `@clerk/nextjs` integrated; env vars set.
- **Layout:** App wrapped with `ClerkProvider` in [app/layout.tsx](app/layout.tsx).
- **Middleware:** [middleware.ts](middleware.ts) uses `clerkMiddleware` with public routes defined.
- **Auth helpers:** [lib/auth.ts](lib/auth.ts) uses Clerk `auth()` and `currentUser()`; `getUserId()` / `getCurrentUser()` read Clerk `userId` and look up `public.users` by that id.
- **API routes:** All use Clerk `auth().userId` and Supabase `createAdminClient()`; no Supabase Auth.

### Phase 3: Auth UI
- **Clerk appearance:** [lib/clerk-appearance.ts](lib/clerk-appearance.ts) – `mossClerkAppearance` (dark theme, Moss branding).
- **Login / Signup:** [app/login](app/login), [app/signup](app/signup) use Clerk `<SignIn />` / `<SignUp />` with Moss layout and appearance.
- **Onboarding:** [app/onboarding](app/onboarding) collects username and calls `POST /api/users/create` to create/update `public.users` with Clerk user id.
- **Profile sign out:** Own profile page has a fixed bottom bar with “sign out” (Clerk).

### UI / Feed (Post–Clerk)
- Feed header: **Profile avatar left**, **moss logo right** (small, same size as share page), **share** as a **button in the tab row** (top right, aligned with everyone/friends/saved).
- Share removed from bottom bar; bottom bar collapsed = search icon only (right).
- Moss logo on feed and share page brought up (less top padding).

---

## What We Discussed (For Later)

### 1. Migrating *Existing* Supabase Users to Clerk
If you have existing rows in `public.users` with **old** ids (e.g. Supabase Auth UIDs), continuous experience requires:

- **Link:** `public.users.id` must become the **Clerk user id** for that same person.
- **Adding emails from Supabase into Clerk** is not enough by itself; you must **update Supabase** so each user row’s `id` is that person’s Clerk user id (see migration steps below).

### 2. Step-by-Step Migration of Existing Users (Supabase → Clerk)
1. **Back up** DB (and optionally project).
2. **Build mapping** old `users.id` → Clerk user id:
   - For each Supabase user: create or find Clerk user by **email**, get Clerk user id.
   - Store mapping: `(old_id, clerk_id)`.
3. **Update Supabase** (do **not** `UPDATE users SET id = ...` in place; FKs reference `users.id`):
   - For each `(old_id, clerk_id)`:
     - `INSERT INTO users (id, email, username, avatar_color, ...) SELECT clerk_id, email, username, avatar_color, ... FROM users WHERE id = old_id`
     - `UPDATE posts SET user_id = clerk_id WHERE user_id = old_id`
     - `UPDATE saves SET user_id = clerk_id WHERE user_id = old_id`
     - `DELETE FROM users WHERE id = old_id`
   - Run in a transaction per user (or one big transaction).
4. **Optional:** Backfill Clerk profile (name, etc.) from Supabase.
5. **Verify:** Sign in with Clerk (same email), check profile, posts, saves.
6. **Cleanup:** Remove migration scripts; disable Supabase Auth if still on.

**Tables that reference `users.id`:** `posts.user_id`, `saves.user_id`.

#### Migration script (implemented)
- **Script:** [scripts/migrate-users-to-clerk.ts](scripts/migrate-users-to-clerk.ts) – builds mapping (Clerk Backend API: list users by email, create user if missing), then for each user: insert new row with Clerk id, update `posts`/`saves`, delete old row.
- **Env:** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CLERK_SECRET_KEY` (script loads `.env.local` if present).
- **Run:** From project root, after backing up the DB: `npm run migrate:users` (requires `tsx`; run `npm install` first).
- **After running:** Verify by signing in with Clerk (same email); optionally note here when the migration was run and remove or disable the script.

### 3. Moving Off Clerk Later (e.g. “Just Use SendGrid”)
- **SendGrid/Resend** = email delivery only. They don’t replace auth (sessions, identity).
- **Moving off Clerk** = replacing Clerk with another auth layer (e.g. NextAuth + magic link) and using SendGrid/Resend to **send** those emails.
- **Difficulty:** Medium – swap auth in `lib/auth.ts`, middleware, and SignIn/SignUp UI; keep `public.users.id` as the new provider’s user id (or migrate once).
- **Clerk vs NextAuth + Resend:** Clerk = one vendor, fast to ship. NextAuth + your domain + Resend = no single auth vendor, more setup, you own the flow.

### 4. Is Clerk “Really the Best Option?”
- **Best for:** Shipping fast and not owning auth details; okay depending on one vendor.
- **Alternative if you don’t want to rely entirely on Clerk:** NextAuth (Auth.js) + magic link + **your domain** + Resend (or SendGrid) for email. Then you’re not all-in on Clerk.

### 5. Saving Work Without Pushing to Prod
- **Commit locally:** `git add .` then `git commit -m "your message"`. Local commits don’t affect prod until you **push** the branch that prod deploys from.
- **Rollback:** You can roll back to a previous commit (e.g. `git checkout <commit> -- <file>`, `git reset --hard <commit>`, or `git revert <commit>` depending on what you need).

---

## Quick Reference

| Item | Location / Note |
|------|------------------|
| Clerk identity in DB | `public.users.id` = Clerk user id |
| Auth helpers | `lib/auth.ts` – `getUserId()`, `getCurrentUser()` |
| Clerk appearance | `lib/clerk-appearance.ts` – `mossClerkAppearance` |
| Phase 1 migration SQL | `database/migrations/phase1-clerk-rls.sql` |
| Phase 1 plan (original) | `PHASE1-DATABASE-PLAN.md` |
| Existing-user migration script | `scripts/migrate-users-to-clerk.ts` – run with `npm run migrate:users` after backup |
