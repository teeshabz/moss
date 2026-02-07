# Moss: Product Summary & Feature Breakdown

## High-Level Purpose

**Moss** is a social app where users share what they're reading, watching, and listening to. The goal is to "share what moves you"—recommendations as simple posts: a media item (book, article, movie, song, album, podcast, or live) plus an optional short note. There are no passwords: sign-up and login use Clerk (email magic links, OAuth, etc.). Sharing is intentionally limited (3 posts per week) to keep the feed focused and thoughtful. Users can save others' posts for later and view their own profile (shared items and saved items) with the same layout and divider style as the main feed.

---

## Tech Overview

- **Stack:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Clerk (auth), Supabase (Postgres).
- **Architecture:** API-first. All business logic (weekly limit, media validation, deduplication, ownership) lives in API routes or `lib/` modules. The UI calls `GET`/`POST`/`DELETE` APIs via `fetch` and only renders data and handles loading/errors.
- **Auth:** Clerk for sign-up and sign-in (magic links, OAuth, etc.). Supabase holds app data only; no Supabase Auth. **Two-ID model:** Clerk ID lives in `users.clerk_id`; internal `users.id` is used for all DB operations (`posts.user_id`, `saves.user_id`). See [docs/AUTHENTICATION-FLOW.md](docs/AUTHENTICATION-FLOW.md).

---

## Feature Breakdown

### 1. Authentication

**Purpose:** Let users create an account (sign up) or sign in via Clerk—email magic links, OAuth, etc. No Supabase Auth; app identity is two-ID: Clerk ID in `users.clerk_id`, internal `users.id` for all DB operations.

**How it works today:**

- **Login (`/login`):** Clerk handles sign-in (magic link, OAuth, etc.). After sign-in, Clerk redirects to `/feed` or a `next` param. No app-specific check-user API; Clerk manages session.
- **Sign up (`/signup`):** Clerk handles sign-up. After sign-up, redirect typically goes to `/onboarding`. The app does not create a `public.users` row until onboarding (or reconcile).
- **Onboarding (`/onboarding`):** If the user has no row in `public.users` (lookup by `clerk_id`), the page prompts for username and calls `POST /api/users/create`, which inserts a row with internal id (`crypto.randomUUID()`), `clerk_id` (Clerk user ID), email, username, and avatar color. If the user already has a row (e.g. reconciled), the page shows "Go to feed".
- **Reconcile:** If a signed-in Clerk user has no row by `clerk_id` but a row exists by email (e.g. pre–two-ID or another env), `POST /api/auth/reconcile-migration` backfills `clerk_id` only (`UPDATE users SET clerk_id = ? WHERE id = ?`). No row replacement. Onboarding calls this when `GET /api/users/me` returns 404.
- **401 → onboarding:** Feed and saved-posts APIs use internal id from `getUserId()`. If the user is signed in with Clerk but has no row (or no `clerk_id`), the API returns 401. The feed page redirects 401 to `/onboarding` (not `/login`) so the user can create a row or reconcile.
- **Middleware:** Clerk middleware runs on every request (except static assets). Protects non-public routes; unauthenticated users are sent to Clerk sign-in. Public routes: `/`, `/login`, `/signup`, `/auth/callback`, and under `/api` (APIs enforce auth in code and return 401 when needed).

**Key files:** `app/login/[[...rest]]/page.tsx`, `app/signup/[[...rest]]/page.tsx`, `app/onboarding/page.tsx`, `app/api/users/create/route.ts`, `app/api/auth/reconcile-migration/route.ts`, `lib/auth.ts`, `middleware.ts`. Full flow: [docs/AUTHENTICATION-FLOW.md](docs/AUTHENTICATION-FLOW.md).

---

### 2. Onboarding

**Purpose:** After first sign-up (or when feed returns 401), ensure the user has a profile in `public.users` (username, avatar color) and show a simple "Go to feed" entry point. Also supports reconciling existing Supabase users to the current Clerk session (backfill `clerk_id` only).

**How it works today:**

- User lands on `/onboarding` (from post–sign-up redirect or from feed 401). Client calls `GET /api/users/me`. If 404, the app may call `POST /api/auth/reconcile-migration` to link an existing row by email to the current Clerk user; if that succeeds, redirect to feed. If still no row, user is prompted for username; client calls `POST /api/users/create` with the username. That route uses `getClerkUserId()`, checks for an existing row by `clerk_id`, and if none, inserts a row with internal id (`crypto.randomUUID()`), `clerk_id`, email (from Clerk), username, and a random avatar color from the 100-color palette. The onboarding page then shows the user (avatar, username) and a link/button to the feed.
- If the user already has a row in `public.users` (by `clerk_id`), the page loads their profile and "Go to feed". No duplicate create.

**Key files:** `app/onboarding/page.tsx`, `app/api/users/create/route.ts`, `app/api/auth/reconcile-migration/route.ts`, `lib/utils.ts` (`generateAvatarColor`).

---

### 3. Feed

**Purpose:** Show a chronological list of posts from all users (newest first) for the past rolling 7 days. Each post shows who shared it, the media type, title, creator, optional note, and a large media-type icon in the sharer’s avatar color. Authenticated users can save others’ posts (plus icon; bold when saved).

**How it works today:**

- **Page:** `app/feed/page.tsx`. Sticky header: moss icon only (left, links to feed), "share" + star icon (center, links to `/share`), current user’s profile avatar (right, no username). Client-side fetch to `GET /api/feed` (with optional `cursor` and `limit`). Renders a list of posts; each post has header row (avatar, username link to profile, media type, relative time, save button for non-own posts) and content row (title, creator, note, large media-type icon). Thin 1px divider (`h-px bg-stone-800`) between posts with `mt-6 mb-6 pl-9 md:pl-11`. When the 7-day window is exhausted, the feed shows a centered message: "that's everything from the past week. to see more, visit a friend's profile." with a centered half-width divider above it. Bottom bar includes "about" on the left and a friend search on the right.
- **API:** `GET /api/feed`. Requires auth (internal user from `getUserId()`; 401 if signed in with Clerk but no row in `public.users`). Reads `posts` joined with `users` and `media_items`, ordered by `created_at DESC, id DESC`, and **filters to the last 7 days**. Returns `{ items: PostWithRelations[], nextCursor? }` using composite cursor pagination (cursor = base64 of `{ created_at, id }`). Default limit 20, max 50. On 401, feed page redirects to `/onboarding`.
- **Save state:** On load, feed also fetches `GET /api/users/me/saved-ids` to get the current user’s saved post IDs. Toggling save calls `POST /api/posts/[id]/save` or `DELETE /api/posts/[id]/save`. Save button is a plus icon (thin when unsaved, bold when saved); only shown for posts not authored by the current user.

**Key files:** `app/feed/page.tsx`, `app/api/feed/route.ts`, `app/api/users/me/saved-ids/route.ts`, `app/api/posts/[id]/save/route.ts`.

---

### 4. Share Flow (Media Type Selection + Per-Type Forms)

**Purpose:** Let users create a new post by choosing a media type (book, article, movie, song, album, podcast, live) and filling a small form (title, creator, optional note; article also has required URL). Enforce a weekly post limit (3 per week in America/New_York) and deduplicate media items where appropriate.

**How it works today:**

- **Share hub (`/share`):**
  - Client fetches `GET /api/users/me` to get current user and `weeklyPostCount`. Header: back arrow (left), "SHARED THIS WEEK" with up to 3 stars (center, same row as arrow and profile), current user’s profile avatar (right, no username). Media types list below (book, article, movie, song, album, podcast, live); each type links to `/share/[type]` (e.g. `/share/book`). On hover, the media-type icon appears and the label fades slightly. Bottom bar shows the current user (no friend search on share).
- **Share form (`/share/[type]`):**
  - One dynamic page for all types. Config drives labels, placeholders, and field types (text, textarea, url). Common fields: title (required), creator-style field (author/director/artist/host/creator, required), note (optional, 60 chars, textarea with counter). Article also has required URL.
  - **Book search:** a "Search for a book" input calls `GET /api/search/books?q=...` (debounced); results are deduplicated by title+author; user can pick one to autopopulate title/author and submit with `source: 'google_books'`, `sourceId`, and optional `coverUrl` so the same book aligns across users. Manual entry (no search) remains available.
  - **Song/album search:** a "Search for a song/album" input calls `GET /api/search/music?q=...&type=song|album` (debounced). Selecting a result autopopulates title/artist and submits with `source: 'apple_music'`, `sourceId`, `externalUrl`, `coverUrl`, and `metadata` (includes `albumName` for songs). Manual entry remains available.
  - Form submits to `POST /api/posts` with body `{ media: { mediaType, title, creator, externalUrl?, source?, sourceId?, coverUrl?, metadata? }, note? }`.
- **API:** `POST /api/posts`. Requires auth. Validates body; ensures weekly post count in America/New_York is below the limit (3). Looks up or creates `media_items` (deduplication by type+title+creator for manual entries; by source+source_id for integrations). Inserts `posts` with `user_id`, `media_item_id`, `note`. Returns 201 with the new post or 409 if limit reached.
- **Weekly limit:** Implemented in `lib/api/weekly-limit.ts`. `WEEKLY_POST_LIMIT` is 3. Week is Monday–Sunday in America/New_York; counts posts in that window; create-post route returns 409 when count >= 3.
- **Book search:** `GET /api/search/books?q=...`. Requires auth. Calls Google Books API (server-side, `GOOGLE_BOOKS_API_KEY`); returns `{ books: [{ id, title, authors, thumbnail? }] }`. Results are deduplicated by normalized title+author so one option per work (e.g. one "Little Women" by Louisa May Alcott).
- **Apple Music search:** `GET /api/search/music?q=...&type=song|album`. Requires auth. Calls Apple Music API using a signed developer token (from `APPLE_MUSIC_TEAM_ID`, `APPLE_MUSIC_KEY_ID`, and `APPLE_MUSIC_PRIVATE_KEY` or `APPLE_MUSIC_PRIVATE_KEY_PATH`). Returns `{ songs: [{ id, title, creator, albumName?, coverUrl?, externalUrl? }], albums: [{ id, title, creator, coverUrl?, externalUrl? }] }`.

**Key files:** `app/share/page.tsx`, `app/share/[type]/page.tsx`, `app/api/posts/route.ts`, `app/api/search/books/route.ts`, `app/api/search/music/route.ts`, `app/api/users/me/route.ts`, `lib/apple-music.ts`, `lib/api/weekly-limit.ts`, `lib/api/media.ts` (validation and find-or-create media item).

---

### 5. Profile (Shared & Saved Tabs)

**Purpose:** Show a user’s public profile: username, avatar color, and two tabs—**Shared** (posts they created) and **Saved** (posts they saved). Same divider and post spacing as the feed. Owner can delete their own shared posts and unsave saved ones.

**How it works today:**

- **Page:** `app/profile/[username]/page.tsx`. Fetches `GET /api/users/[username]` for profile + paginated shared posts. If viewing own profile, "Saved" tab fetches `GET /api/users/me/saved` (paginated). Shared tab: each post has header row (avatar, username, media type, time, delete button if own) and content row (title, creator, note, large media-type icon). Same thin divider between posts (`mt-6 mb-6 pl-9 md:pl-11`, `h-px bg-stone-800`). Saved tab: same layout; unsave button (plus icon, bold) calls `DELETE /api/posts/[id]/save`. Bottom bar includes friend search on all profiles; own profile also shows "sign out" on the left.
- **APIs:**
  - `GET /api/users/[username]`: Returns profile user (id, username, avatar_color) and post count; returns paginated posts (same shape as feed items) with `nextCursor`.
  - `GET /api/users/me/saved`: Returns paginated list of saved posts (full post + user + media_item) for the current user.

**Key files:** `app/profile/[username]/page.tsx`, `app/api/users/[username]/route.ts`, `app/api/users/me/saved/route.ts`.

---

### 6. Save / Unsave Posts

**Purpose:** Let users save other users’ posts for later and unsave them. Saved posts appear on the profile "Saved" tab and can be used for future features (e.g. reading list).

**How it works today:**

- **Model:** Table `saves` with `(user_id, post_id)` primary key; `user_id` references internal `users.id`. API uses service role and enforces "current user" in code (internal id from `getUserId()`).
- **APIs:**
  - `POST /api/posts/[id]/save`: Auth required (internal id). Ensures post exists and is not the current user’s; upserts a row in `saves`. Returns 201 or 403/404 as appropriate.
  - `DELETE /api/posts/[id]/save`: Auth required (internal id). Removes the save for the current user and that post.
  - `GET /api/users/me/saved-ids`: Returns list of post IDs the current user has saved (used by feed to show bold plus).
  - `GET /api/users/me/saved`: Returns full saved posts with cursor pagination for the profile Saved tab. On 401, feed page redirects to `/onboarding`.

**Key files:** `app/api/posts/[id]/save/route.ts`, `app/api/users/me/saved-ids/route.ts`, `app/api/users/me/saved/route.ts`, `database/schema.sql` (saves table and RLS).

---

### 7. Smile Reactions & Pings

**Purpose:** Let users privately smile at another user’s post (no public count). Smiles create a ping notification for the post author. Unsmiling removes the reaction and its ping.

**How it works today:**

- **Model:** `post_reactions` with composite PK `(user_id, post_id, reaction_type)` and `reaction_type = 'smile'` only. `pings` rows track recipient, actor, post, type (`'smile'`), timestamps, and `seen_at`. All FKs use `ON DELETE CASCADE`.
- **APIs:**
  - `POST /api/posts/[id]/smile`: Creates `post_reactions` and a `pings` row (no-op if already smiled).
  - `DELETE /api/posts/[id]/smile`: Deletes the reaction and its matching ping.
  - `GET /api/users/me/pings`: Returns pings for the current user, joined with actor username/avatar and post title.
  - `POST /api/users/me/pings/seen`: Marks all unseen pings as seen.
- **Feed/Profile state:** Feed and profile APIs return `smiledByCurrentUser` so the UI can render the active state.
- **UI:** Smile button shows on the **home feed** and on **other users’ profiles** (not on saved tab, not on your own profile). Clicking toggles local state and hits POST/DELETE. Pings tab lists smile notifications; unread pings show a dot on the feed avatar and on the Pings tab, and disappear when viewing Pings.

**Key files:** `app/api/posts/[id]/smile/route.ts`, `app/api/users/me/pings/route.ts`, `app/api/users/me/pings/seen/route.ts`, `app/feed/page.tsx`, `app/profile/[username]/page.tsx`, `database/migrations/phase5-add-smile-reactions.sql`.

---

### 8. Delete Post

**Purpose:** Let a user delete their own post. Frees a slot for the weekly limit.

**How it works today:**

- **API:** `DELETE /api/posts/[id]`. Requires auth (internal id from `getUserId()`). Loads the post; verifies `post.user_id === currentUser.id` (internal id); deletes the post. Returns 204 or 403/404. Weekly limit is re-calculated on next create, so deletion effectively frees a slot.
- **UI:** Profile Shared tab shows a delete (X) button only for the current user’s posts; no delete on the feed.

**Key files:** `app/api/posts/[id]/route.ts`, `app/profile/[username]/page.tsx`.

---

### 9. Media Types & Validation

**Purpose:** Support seven media types (book, article, movie, song, album, podcast, live) with consistent validation and optional article URL. Reuse existing media items when the same thing is shared again (deduplication).

**How it works today:**

- **Types:** Enum in DB and TypeScript: BOOK, ARTICLE, MOVIE, SONG, ALBUM, PODCAST, LIVE. Article is the only one with required `external_url` (HTTPS) in validation.
- **Validation:** In `lib/api/media.ts`. Validates `mediaType`, `title`, `creator`; for article, `externalUrl` required and valid. `findOrCreateMediaItem` handles deduplication: for manual entries (no source/source_id), matches by media_type + case-insensitive title + creator (and null/empty creator); for integration entries, matches by source + source_id. Creates a new `media_items` row only when no match is found. `metadata` supports Apple Music extras such as `albumName`.
- **DB:** Partial unique index on `media_items(source, source_id)` where both are non-null; multiple manual entries (null, null) are allowed.

**Key files:** `lib/api/media.ts`, `lib/types.ts`, `database/schema.sql`.

---

### 10. Avatar Color

**Purpose:** Give each user a stable, random color for their avatar and for the large media icon on their posts (no image upload in current version).

**How it works today:**

- On user creation (`POST /api/users/create`), `generateAvatarColor()` in `lib/utils.ts` picks a random color from a 100-color palette (terracotta, blues, greens, purples, pinks, neutrals, etc.). Stored in `users.avatar_color` and used in the UI for circles and media icons.

**Key files:** `lib/utils.ts`, `app/api/users/create/route.ts`.

---

### 11. UI Consistency (Feed & Profile)

**Purpose:** Same look and feel on feed and profile: thin divider between posts, same spacing, same header/content row layout, same typography and colors.

**How it works today:**

- **Feed and profile (Shared & Saved):** Header row: avatar (`md:w-8 md:h-8 w-6 h-6`), metadata with bullets `text-stone-700`, responsive text `md:text-sm text-xs`. Content row: `md:pl-11 pl-9`, `gap-4`, title `md:text-base text-sm`, note `md:text-sm text-xs line-clamp-3`. Divider between posts: wrapper `mt-6 mb-6 pl-9 md:pl-11`, line `h-px bg-stone-800`. Large media-type icon on the right, colored by post author’s `avatar_color`. Save/unsave control is a plus icon (thin when unsaved, bold when saved).

**Key files:** `app/feed/page.tsx`, `app/profile/[username]/page.tsx`.

---

### 12. Error Handling & Resilience

**Purpose:** Surface API errors (validation, 409 limit, 404, 500) in the UI and log server-side for debugging.

**How it works today:**

- API routes return JSON `{ error: "message", code?: "..." }` with appropriate status codes. Pages use `fetch`, check `response.ok`, and display error messages or inline validation errors. React error boundary (`lib/components/ErrorBoundary.tsx`, wrapped in layout) catches render errors and shows a fallback UI.

**Key files:** Various API routes, `app/share/[type]/page.tsx`, `app/feed/page.tsx`, `lib/components/ErrorBoundary.tsx`, `app/layout.tsx`.

---

### 13. Dev / Ops

**Purpose:** Sanity-check Supabase connectivity and env configuration during development.

**How it works today:**

- **`GET /api/test-connection`:** Checks env vars (Supabase URL, anon key, service role key, DB URL), client creation, a simple DB query, and auth service. Returns JSON with checks and any errors. No secrets are exposed (only "set" / "missing").
- **Standalone scripts:** `test-connection.js` (Supabase/env checks) and `scripts/test-apple-music.ts` (Apple Music key parse → JWT sign → API call) for quick validation during development.

**Key files:** `app/api/test-connection/route.ts`, `test-connection.js`.

---

## Data Model (Summary)

- **users:** id (internal PK, e.g. UUID), clerk_id (Clerk user ID, unique, nullable), email, username, avatar_color, phone_number, first_name, last_name, created_at. All app logic uses internal id; Clerk ID links session to row.
- **media_items:** id, media_type, title, creator, external_url, cover_url, source, source_id, metadata, created_at. Unique (source, source_id) when both non-null.
- **posts:** id, user_id (references users.id), media_item_id, note, created_at. Indexed for feed and user timelines.
- **saves:** user_id (references users.id), post_id, created_at. Primary key (user_id, post_id). API enforces "current user" by internal id.

---

## What’s Not Implemented (or Optional) Today

- **Cover images:** `cover_url` exists on media_items and is stored when sharing from Google Books, but is not displayed in the feed/profile (large media-type icon is used instead).
- **Username changes:** No ability to change username; edit profile only updates phone/first/last name and avatar color.
- **Public feed:** Feed and profile require authentication; there is no public view.

This document reflects how Moss works as of the current codebase. For API contracts, pagination, and weekly limit details, see `DESIGN.md`.
