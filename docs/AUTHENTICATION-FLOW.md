# Authentication Flow (Clerk + Supabase, Two-ID)

This document describes how authentication and user identity work in Moss: Clerk for sessions, Supabase for data, with a **two-ID** model (Clerk ID for auth, internal `users.id` for all DB operations).

---

## 1. Identity Model (Two IDs)

| Concept        | Where it lives       | Purpose |
|----------------|----------------------|--------|
| **Clerk ID**   | `users.clerk_id`     | Links the Clerk session to a row in `public.users`. Can differ per environment (dev vs prod). |
| **Internal ID**| `users.id` (PK)      | Stable DB identity. `posts.user_id` and `saves.user_id` reference this. Never changes. |

- **Resolve “current user”:** Clerk session → `auth().userId` (Clerk ID) → lookup `users` by `clerk_id` → use `user.id` (internal) for all reads/writes.
- **New sign-ups:** Insert row with `id = crypto.randomUUID()` and `clerk_id = Clerk user ID`.
- **Existing users (migration):** Set `clerk_id` via backfill script or reconcile endpoint; `users.id` stays unchanged.

---

## 2. Sign-Up Flow

1. User goes to **`/signup`**.
2. Clerk handles sign-up (email, optional OAuth). No Supabase Auth.
3. After Clerk creates the user, the app redirects as configured (e.g. to `/onboarding`).
4. **Onboarding (`/onboarding`):**
   - Client calls `GET /api/users/me`. If **404** (no row in `public.users`), the user is prompted for username.
   - Client calls `POST /api/users/create` with `{ username }`.
   - **User create** uses `getClerkUserId()` to ensure the user is signed in and to get the Clerk ID. It checks for an existing row by `clerk_id`; if none, it inserts a new row with:
     - `id`: new UUID (`crypto.randomUUID()`)
     - `clerk_id`: Clerk user ID
     - `email`, `username`, `avatar_color` (from Clerk + palette)
   - After success, user is sent to `/feed`.

---

## 3. Sign-In Flow

1. User goes to **`/login`**.
2. Clerk handles sign-in (magic link, OAuth, etc.). No Supabase Auth.
3. After sign-in, Clerk redirects (e.g. to `/feed` or `next` param).
4. **First request to app:**
   - API routes use `getUserId()` or `getCurrentUser()`, which look up `users` by `clerk_id`.
   - If a row exists → internal id is used for feed, posts, saves, profile.
   - If **no row** (e.g. existing Supabase user not yet linked) → `getUserId()` returns `null` → API returns **401**.

---

## 4. 401 and Onboarding

- **Feed (and saved posts)** require an internal user: `GET /api/feed` and `GET /api/users/me/saved` use `getUserId()`. If the user is signed in with Clerk but has no row in `public.users` (or row has no `clerk_id`), the API returns **401**.
- **Client behavior:** On 401 from feed or saved list, the app redirects to **`/onboarding`** (not `/login`), so the user can:
  - **Create a new row:** `POST /api/users/create` (new users).
  - **Reconcile:** `POST /api/auth/reconcile-migration` (existing Supabase user with same email; backfills `clerk_id` only).

---

## 5. Reconcile (Backfill `clerk_id`)

When a user is signed in with Clerk but has no row in `public.users` **by `clerk_id`**, they may already have a row **by email** (e.g. pre–two-ID data or another env).

- **Endpoint:** `POST /api/auth/reconcile-migration`.
- **Behavior:**
  1. Get Clerk ID from session; if missing, return 401.
  2. Look up `users` by `clerk_id`. If found, return 200 (already linked).
  3. Get primary email from Clerk; look up `users` by email (case-insensitive).
  4. If a row exists and does not already have this `clerk_id`, run:  
     `UPDATE users SET clerk_id = ? WHERE id = ?`  
     (no new row, no changes to `posts` or `saves`).
  5. Return 200 with `reconciled: true` or `false`.

Onboarding page calls this when `GET /api/users/me` returns 404; if reconcile succeeds, user is redirected to `/feed`.

---

## 6. API Route Conventions

- **Clerk ID only** where we need “signed in with Clerk” or the value to store in `clerk_id`:
  - `getClerkUserId()` — used in **user create** and **reconcile**.
- **Internal ID** for all other “current user” logic:
  - `getUserId()` — returns internal id or `null`; use for 401 checks and for `user_id` in queries/mutations.
  - `getCurrentUser()` — returns full `users` row (lookup by `clerk_id`); use when you need the user object (e.g. `GET /api/users/me`).

All API routes that need the current user for DB operations use `getUserId()` or `getCurrentUser().id`. No route uses Clerk ID for `posts.user_id` or `saves.user_id`.

---

## 7. Middleware

- **Clerk middleware** runs on every request (except static assets). It protects non-public routes (e.g. `/feed`, `/share`, `/profile`) so unauthenticated users are redirected to Clerk sign-in.
- Public routes: `/`, `/login`, `/signup`, `/auth/callback`, and under `/api` (API routes enforce auth in code and return 401 when needed).

---

## 8. Key Files

| Area           | File(s) |
|----------------|---------|
| Auth helpers   | `lib/auth.ts` — `getClerkUserId()`, `getUserId()`, `getCurrentUser()` |
| User create    | `app/api/users/create/route.ts` — insert with internal id + `clerk_id` |
| Reconcile      | `app/api/auth/reconcile-migration/route.ts` — backfill `clerk_id` by email |
| Onboarding     | `app/onboarding/page.tsx` — create or reconcile, then redirect to feed |
| Feed 401       | `app/feed/page.tsx` — on 401, redirect to `/onboarding` |
| Middleware     | `middleware.ts` — Clerk `clerkMiddleware`, public route matcher |
| DB migration   | `database/migrations/phase2-clerk-id-column.sql` — adds `users.clerk_id` |

---

## 9. Migration and Backfill

- **Phase 2 migration:** Run `phase2-clerk-id-column.sql` in Supabase to add `users.clerk_id` (unique, nullable). Do not change `users.id` or FKs.
- **Backfill existing users:** Run `scripts/migrate-users-to-clerk.ts` (or equivalent) to set `clerk_id` for existing rows: for each user, find or create Clerk user by email, then `UPDATE users SET clerk_id = ? WHERE id = ?`. No row replacement, no changes to `posts` or `saves`.

For full migration status and order of operations, see [CLERK-SUPABASE-MIGRATION-STATUS.md](CLERK-SUPABASE-MIGRATION-STATUS.md).
