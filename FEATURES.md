# Moss: Product Summary & Feature Breakdown

## High-Level Purpose

**Moss** is a social app where users share what they're reading, watching, and listening to. The goal is to "share what moves you"—recommendations as simple posts: a media item (book, article, movie, song, album, or podcast) plus an optional short note. There are no passwords: sign-up and login use email magic links. Sharing is intentionally limited (e.g. 3 posts per week) to keep the feed focused and thoughtful. Users can save others' posts for later and view their own profile (shared items and saved items) with the same layout and divider style as the main feed.

---

## Tech Overview

- **Stack:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Supabase (Postgres + Auth).
- **Architecture:** API-first. All business logic (weekly limit, media validation, deduplication, ownership) lives in API routes or `lib/` modules. The UI calls `GET`/`POST`/`DELETE` APIs via `fetch` and only renders data and handles loading/errors.
- **Auth:** Supabase Auth with email magic links. Session refresh is handled in middleware; protected routes redirect to `/login` when unauthenticated.

---

## Feature Breakdown

### 1. Authentication

**Purpose:** Let users create an account (sign up) or sign in with email only—no passwords.

**How it works today:**

- **Login (`/login`):**
  - User enters email. App calls `POST /api/auth/check-user` with that email.
  - Backend uses Supabase Admin API to see if a user exists and if their email is verified.
  - If user does not exist or email is not verified → show "Couldn't find account" (or similar); no magic link is sent.
  - If user exists and is verified → Supabase sends a magic link. User clicks it and is redirected to `/auth/callback?code=...&type=login`. Callback exchanges the code for a session and redirects to `/feed` (or `next` param).
- **Sign up (`/signup`):**
  - User enters username + email. App calls `supabase.auth.signUp()` (with a random password workaround so Supabase still sends the confirmation email). Confirmation email contains a link to `/auth/callback?code=...&type=signup`.
  - When the user clicks the link, callback exchanges the code for a session. If there is no row in `public.users` for this `auth.uid()`, the callback creates one (id = auth.uid(), email, username from metadata or email prefix, random `avatar_color` from a 100-color palette) and redirects to `/onboarding`. If email confirmation is disabled in Supabase, the flow may create the user and redirect to login so the user can "log in" to finish.
- **Auth callback (`/auth/callback`):**
  - Handles both login and signup magic-link redirects. Exchanges `code` for a session. If the user does not exist in `public.users`, creates the row (signup path) and redirects to onboarding or login; otherwise redirects to feed (or `next`).
- **Middleware:**
  - Runs on every request (except static assets). Uses Supabase SSR client to refresh the session. If there is no authenticated user and the path is not `/`, `/login`, `/signup`, or `/auth/callback`, and not under `/api`, the user is redirected to `/login?redirect=<current path>`.

**Key files:** `app/login/page.tsx`, `app/signup/page.tsx`, `app/auth/callback/route.ts`, `app/api/auth/check-user/route.ts`, `middleware.ts`.

---

### 2. Onboarding

**Purpose:** After first sign-up, ensure the user has a profile in `public.users` (username, avatar color) and show a simple "Go to feed" entry point.

**How it works today:**

- If the user lands on `/onboarding` and is logged in but has no row in `public.users`, the app calls `POST /api/users/create` with the username (from metadata or localStorage/email fallback). That route creates the row with a random avatar color from the 100-color palette and returns. The onboarding page then shows the user (avatar, username) and a link/button to the feed.
- If the user already exists in `public.users`, the page just loads and displays their profile and "Go to feed". No duplicate create.

**Key files:** `app/onboarding/page.tsx`, `app/api/users/create/route.ts`, `lib/utils.ts` (`generateAvatarColor`).

---

### 3. Feed

**Purpose:** Show a chronological list of posts from all users (newest first). Each post shows who shared it, the media type, title, creator, optional note, and a large media-type icon in the sharer’s avatar color. Authenticated users can save others’ posts (plus icon; bold when saved).

**How it works today:**

- **Page:** `app/feed/page.tsx`. Client-side fetch to `GET /api/feed` (with optional `cursor` and `limit`). Renders a list of posts; each post has header row (avatar, username link to profile, media type, relative time, save button for non-own posts) and content row (title, creator, note, large media-type icon). Thin 1px divider (`h-px bg-stone-800`) between posts with `mt-6 mb-6 pl-9 md:pl-11`. "Load more" uses `nextCursor` from the response.
- **API:** `GET /api/feed`. Requires auth. Reads `posts` joined with `users` and `media_items`, ordered by `created_at DESC, id DESC`. Returns `{ items: PostWithRelations[], nextCursor? }` using composite cursor pagination (cursor = base64 of `{ created_at, id }`). Default limit 20, max 50.
- **Save state:** On load, feed also fetches `GET /api/users/me/saved-ids` to get the current user’s saved post IDs. Toggling save calls `POST /api/posts/[id]/save` or `DELETE /api/posts/[id]/save`. Save button is a plus icon (thin when unsaved, bold when saved); only shown for posts not authored by the current user.

**Key files:** `app/feed/page.tsx`, `app/api/feed/route.ts`, `app/api/users/me/saved-ids/route.ts`, `app/api/posts/[id]/save/route.ts`.

---

### 4. Share Flow (Media Type Selection + Per-Type Forms)

**Purpose:** Let users create a new post by choosing a media type (book, article, movie, song, album, podcast) and filling a small form (title, creator, optional note; article also has required URL). Enforce a weekly post limit (e.g. 3 per week in America/New_York) and deduplicate media items where appropriate.

**How it works today:**

- **Share hub (`/share`):**
  - Client fetches `GET /api/users/me` to get current user and `weeklyPostCount`. Renders "SHARED THIS WEEK" with up to 3 stars filled by count, and a list of media types (book, article, movie, song, album, podcast). Each type links to `/share/[type]` (e.g. `/share/book`). Icons and styling match the design (hover states, media-type colors).
- **Share form (`/share/[type]`):**
  - One dynamic page for all types. Config drives labels, placeholders, and field types (text, textarea, url). Common fields: title (required), creator-style field (author/director/artist/host, required), note (optional, 60 chars, textarea with counter). Article also has required URL. Form submits to `POST /api/posts` with body `{ media: { mediaType, title, creator, externalUrl? }, note? }`.
- **API:** `POST /api/posts`. Requires auth. Validates body; ensures weekly post count in America/New_York is below the limit (e.g. 3). Looks up or creates `media_items` (deduplication by type+title+creator for manual entries; by source+source_id for integrations). Inserts `posts` with `user_id`, `media_item_id`, `note`. Returns 201 with the new post or 409 if limit reached.
- **Weekly limit:** Implemented in `lib/api/weekly-limit.ts`. Week is Monday–Sunday in America/New_York; counts posts in that window; `canCreatePost` (or equivalent) is used in the create-post route to return 409 when count >= 3.

**Key files:** `app/share/page.tsx`, `app/share/[type]/page.tsx`, `app/api/posts/route.ts`, `app/api/users/me/route.ts`, `lib/api/weekly-limit.ts`, `lib/api/media.ts` (validation and find-or-create media item).

---

### 5. Profile (Shared & Saved Tabs)

**Purpose:** Show a user’s public profile: username, avatar color, and two tabs—**Shared** (posts they created) and **Saved** (posts they saved). Same divider and post spacing as the feed. Owner can delete their own shared posts and unsave saved ones.

**How it works today:**

- **Page:** `app/profile/[username]/page.tsx`. Fetches `GET /api/users/[username]` for profile + paginated shared posts. If viewing own profile, "Saved" tab fetches `GET /api/users/me/saved` (paginated). Shared tab: each post has header row (avatar, username, media type, time, delete button if own) and content row (title, creator, note, large media-type icon). Same thin divider between posts (`mt-6 mb-6 pl-9 md:pl-11`, `h-px bg-stone-800`). Saved tab: same layout; unsave button (plus icon, bold) calls `DELETE /api/posts/[id]/save`.
- **APIs:**
  - `GET /api/users/[username]`: Returns profile user (id, username, avatar_color) and post count; returns paginated posts (same shape as feed items) with `nextCursor`.
  - `GET /api/users/me/saved`: Returns paginated list of saved posts (full post + user + media_item) for the current user.

**Key files:** `app/profile/[username]/page.tsx`, `app/api/users/[username]/route.ts`, `app/api/users/me/saved/route.ts`.

---

### 6. Save / Unsave Posts

**Purpose:** Let users save other users’ posts for later and unsave them. Saved posts appear on the profile "Saved" tab and can be used for future features (e.g. reading list).

**How it works today:**

- **Model:** Table `saves` with `(user_id, post_id)` primary key; RLS so users only see and mutate their own saves.
- **APIs:**
  - `POST /api/posts/[id]/save`: Auth required. Ensures post exists and is not the current user’s; upserts a row in `saves`. Returns 201 or 403/404 as appropriate.
  - `DELETE /api/posts/[id]/save`: Auth required. Removes the save for the current user and that post.
  - `GET /api/users/me/saved-ids`: Returns list of post IDs the current user has saved (used by feed to show bold plus).
  - `GET /api/users/me/saved`: Returns full saved posts with cursor pagination for the profile Saved tab.

**Key files:** `app/api/posts/[id]/save/route.ts`, `app/api/users/me/saved-ids/route.ts`, `app/api/users/me/saved/route.ts`, `database/schema.sql` (saves table and RLS).

---

### 7. Delete Post

**Purpose:** Let a user delete their own post. Frees a slot for the weekly limit.

**How it works today:**

- **API:** `DELETE /api/posts/[id]`. Requires auth. Loads the post; verifies `post.user_id === currentUser.id`; deletes the post. Returns 204 or 403/404. Weekly limit is re-calculated on next create, so deletion effectively frees a slot.
- **UI:** Profile Shared tab shows a delete (X) button only for the current user’s posts; no delete on the feed.

**Key files:** `app/api/posts/[id]/route.ts`, `app/profile/[username]/page.tsx`.

---

### 8. Media Types & Validation

**Purpose:** Support six media types (book, article, movie, song, album, podcast) with consistent validation and optional article URL. Reuse existing media items when the same thing is shared again (deduplication).

**How it works today:**

- **Types:** Enum in DB and TypeScript: BOOK, ARTICLE, MOVIE, SONG, ALBUM, ARTICLE. Article is the only one with required `external_url` (HTTPS) in validation.
- **Validation:** In `lib/api/media.ts`. Validates `mediaType`, `title`, `creator`; for article, `externalUrl` required and valid. `findOrCreateMediaItem` handles deduplication: for manual entries (no source/source_id), matches by media_type + case-insensitive title + creator (and null/empty creator); for integration entries, matches by source + source_id. Creates a new `media_items` row only when no match is found.
- **DB:** Partial unique index on `media_items(source, source_id)` where both are non-null; multiple manual entries (null, null) are allowed.

**Key files:** `lib/api/media.ts`, `lib/types.ts`, `database/schema.sql`.

---

### 9. Avatar Color

**Purpose:** Give each user a stable, random color for their avatar and for the large media icon on their posts (no image upload in current version).

**How it works today:**

- On user creation (auth callback or `/api/users/create`), `generateAvatarColor()` in `lib/utils.ts` picks a random color from a 100-color palette (terracotta, blues, greens, purples, pinks, neutrals, etc.). Stored in `users.avatar_color` and used in the UI for circles and media icons.

**Key files:** `lib/utils.ts`, `app/auth/callback/route.ts`, `app/api/users/create/route.ts`.

---

### 10. UI Consistency (Feed & Profile)

**Purpose:** Same look and feel on feed and profile: thin divider between posts, same spacing, same header/content row layout, same typography and colors.

**How it works today:**

- **Feed and profile (Shared & Saved):** Header row: avatar (`md:w-8 md:h-8 w-6 h-6`), metadata with bullets `text-stone-700`, responsive text `md:text-sm text-xs`. Content row: `md:pl-11 pl-9`, `gap-4`, title `md:text-base text-sm`, note `md:text-sm text-xs line-clamp-3`. Divider between posts: wrapper `mt-6 mb-6 pl-9 md:pl-11`, line `h-px bg-stone-800`. Large media-type icon on the right, colored by post author’s `avatar_color`. Save/unsave control is a plus icon (thin when unsaved, bold when saved).

**Key files:** `app/feed/page.tsx`, `app/profile/[username]/page.tsx`.

---

### 11. Error Handling & Resilience

**Purpose:** Surface API errors (validation, 409 limit, 404, 500) in the UI and log server-side for debugging.

**How it works today:**

- API routes return JSON `{ error: "message", code?: "..." }` with appropriate status codes. Pages use `fetch`, check `response.ok`, and display error messages or inline validation errors. React error boundary (`lib/components/ErrorBoundary.tsx`, wrapped in layout) catches render errors and shows a fallback UI.

**Key files:** Various API routes, `app/share/[type]/page.tsx`, `app/feed/page.tsx`, `lib/components/ErrorBoundary.tsx`, `app/layout.tsx`.

---

### 12. Dev / Ops

**Purpose:** Sanity-check Supabase connectivity and env configuration during development.

**How it works today:**

- **`GET /api/test-connection`:** Checks env vars (Supabase URL, anon key, service role key, DB URL), client creation, a simple DB query, and auth service. Returns JSON with checks and any errors. No secrets are exposed (only "set" / "missing").
- **Standalone script:** `test-connection.js` in project root can be run with Node to run similar checks from the command line.

**Key files:** `app/api/test-connection/route.ts`, `test-connection.js`.

---

## Data Model (Summary)

- **users:** id (matches auth.uid()), email, username, avatar_color, created_at.
- **media_items:** id, media_type, title, creator, external_url, cover_url, source, source_id, metadata, created_at. Unique (source, source_id) when both non-null.
- **posts:** id, user_id, media_item_id, note, created_at. Indexed for feed and user timelines.
- **saves:** user_id, post_id, created_at. Primary key (user_id, post_id). RLS for own saves only.

---

## What’s Not Implemented (or Optional) Today

- **Google Books (or other) search:** No `GET /api/search/books` wired in the share flow; book (and other) forms are manual entry only.
- **Cover images:** `cover_url` exists on media_items but is not required or displayed in the feed/profile (large media-type icon is used instead).
- **Username/edit profile:** No dedicated settings page to change username or avatar color after signup.
- **Public feed:** Feed and profile require authentication; there is no public view.

This document reflects how Moss works as of the current codebase. For API contracts, pagination, and weekly limit details, see `DESIGN.md`.
