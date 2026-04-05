# Moss Design Document v2

## Architecture: API-First, Mobile-Ready

Moss is structured as an API-first application where **the backend API is the single source of truth** for all business logic. The web app is a client of that API, just like the future mobile app will be.

### Principles

- **Business logic only in the backend**: Weekly limit, media validation, ownership checks, deduplication—all live in API route handlers or in `lib/` modules called exclusively by those handlers. UI components must not implement or duplicate these rules.

- **Thin UI**: Pages and components fetch from `GET /api/...` and submit to `POST` / `DELETE` via `fetch`. They render data and handle UX only (loading, errors, empty states).

- **REST-style, JSON API**: Explicit request/response contracts. Use standard HTTP methods and status codes. No Server Actions or RSC-only mutation paths for feed/posts—those flows go through Route Handlers only. This keeps the API stable and reusable by any client.

- **Stable contracts**: Database schema and API request/response shapes are treated as stable. Avoid breaking changes so a future mobile client can consume the same endpoints without rework.

- **Auth**: Use Supabase Auth with session-based authentication. Both web and future native apps authenticate the same way via Supabase sessions.

### Implications

- **No** Server Actions for create/delete post or for feed loading. Use Route Handlers only.
- **No** direct Supabase/database access from pages or components for feed or post mutations. All such access happens inside API routes (or lib code invoked by them).
- **UI must not** enforce business rules (weekly limit, media validation, ownership). It only calls the API, displays responses, and surfaces error payloads (e.g. 409 "limit reached").
- **Optional**: Server Components may perform **read-only** fetches (e.g. initial feed) by calling your own API (same JSON contract) if you want SSR; the canonical implementation remains the API. For consistency and to avoid self-requests, **recommend** client-side `fetch` to `/api/feed`, `/api/posts`, etc. for all feed/post data. Static layout (headers, auth gates) can stay in RSC.

---

## Tech Stack

### Core Framework: **Next.js 14+ (App Router)**
- TypeScript
- Tailwind CSS
- ESLint

### Database & Authentication: **Supabase**
- **Database**: Postgres via Supabase (open source, self-hostable option)
- **Authentication**: Supabase Auth (email magic links, built-in, free tier)
- **Why**: Unified service for DB + Auth, simpler stack, no Prisma needed for MVP
- Use Supabase JS client (`@supabase/supabase-js`, `@supabase/ssr`) for queries

### Deployment: **Vercel**
- Zero-config Next.js deployment, automatic previews, edge functions

### What We're NOT Using
- **No Prisma**: Direct Supabase client for database queries
- **No Clerk**: Supabase Auth handles authentication

---

## Database Schema

### Tables

**users**
- `id` TEXT PRIMARY KEY (matches `auth.uid()` UUID from Supabase Auth)
- `email` TEXT UNIQUE NOT NULL
- `username` TEXT UNIQUE NOT NULL (3-20 chars, alphanumeric + underscore, case-insensitive uniqueness)
- `avatar_color` TEXT (hex color, e.g. "#E07C54")
- `created_at` TIMESTAMP WITH TIME ZONE

**Constraints:**
- Username length: 3-20 characters
- Username format: `^[a-zA-Z0-9_]+$` (no spaces)
- Reserved usernames: `moss`, `api`, `admin`, `support`

**media_items**
- `id` TEXT PRIMARY KEY
- `media_type` ENUM (BOOK, MOVIE, PODCAST, SONG, ALBUM, ARTICLE)
- `title` TEXT NOT NULL
- `creator` TEXT NOT NULL
- `external_url` TEXT (required for ARTICLE type, must be HTTPS)
- `cover_url` TEXT
- `source` TEXT (e.g. "google_books")
- `source_id` TEXT (e.g. Google Books volume ID)
- `metadata` JSONB (flexible JSON for integration-specific data)
- `created_at` TIMESTAMP WITH TIME ZONE

**Unique constraint:** `(source, source_id)` when both are non-null (for integration deduplication)

**posts**
- `id` TEXT PRIMARY KEY
- `user_id` TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
- `media_item_id` TEXT NOT NULL REFERENCES media_items(id) ON DELETE RESTRICT
- `note` TEXT
- `created_at` TIMESTAMP WITH TIME ZONE

**Indexes:**
- `(user_id, created_at DESC)` - for user's posts queries
- `(created_at DESC)` - for feed queries
- `(source, source_id)` on media_items WHERE source IS NOT NULL - for integration lookups

### Row Level Security (RLS)

All tables have RLS enabled with policies:
- **Public read** for feed: Allow SELECT on `posts`, `media_items`, `users` for all authenticated users
- **Authenticated insert** for posts: Allow INSERT on `posts` for authenticated users
- **Owner delete** for posts: Allow DELETE on `posts` only where `user_id = auth.uid()`
- **User profile**: Allow users to read/update their own `users` row where `id = auth.uid()`

---

## Authentication: Supabase Auth

### Auth Flow

1. **Sign-up ("make an account")**: User enters **username** + **email** → "get magic link". We send magic link; show "link has been sent! / check your email" screen.

2. **Login**: User enters **email** → "connect" → magic link sent. "need an account? create" links to sign-up.

3. **After magic link click**: 
   - **New users** → **set up profile** (onboarding page: welcome + username + random `avatarColor` + "Go to feed") → feed
   - **Returning users** → feed directly

4. **No passwords.** Email + magic link only.

5. **No invite-only.** Anyone can sign up.

### Username Rules

- 3–20 characters, no spaces. Case-insensitive uniqueness ("Alex" and "alex" are the same).
- Reserved (blocked): `moss`, `api`, `admin`, `support`. No duplicate usernames.
- Validate on sign-up; return clear errors (e.g. `409`, `code: "username_taken"`).

### Avatar

- No image upload. Store `avatarColor` (hex). **v0**: randomly assign from a warm-tones palette on account creation. **v2**: color picker.

### User Sync Mechanism

- Supabase Auth automatically creates identity in `auth.users` table
- On first login/onboarding, app creates/ensures row in `public.users` table
- **Key**: `users.id` should equal `auth.uid()` (same UUID) for easy ownership checks and RLS policies
- Create helper function that:
  - Checks if user exists in `public.users` table
  - If not, creates row with `id = auth.uid()`, `email` from auth, collects `username` during onboarding
  - Assigns random `avatarColor` from warm palette

### Supabase Configuration

- **Site URL**: `http://localhost:3000` (development), production URL (production)
- **Redirect URLs**: 
  - `http://localhost:3000/auth/callback` (development)
  - `https://your-vercel-url.vercel.app/auth/callback` (production)
- Enable **Email** provider
- Environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-only, for admin operations)

### Client Helpers

- `lib/supabase/client.ts` - Browser client helper (`createBrowserClient` from `@supabase/ssr`)
- `lib/supabase/server.ts` - Server client helper (`createServerClient` from `@supabase/ssr` with cookie handling)
- `lib/auth.ts` - Auth helper functions (`getCurrentUser`, `requireAuth`, `getSession`, `getSupabaseUser`)
- `middleware.ts` - Session refresh middleware using `@supabase/ssr`

---

## API Routes (Next.js Route Handlers)

All feed and post behavior goes through these REST endpoints. The web app calls them via `fetch`; a future mobile app will use the same URLs and JSON contracts.

### Stable API Contracts

- **Success**: JSON body with `data` (or `items` for lists). Use standard status codes: `200`, `201`, `204`.
- **Errors**: JSON `{ "error": "human-readable message", "code": "optional_code" }`. Use `400` (validation), `401` (unauthenticated), `403` (forbidden), `404` (not found), `409` (e.g. weekly limit exceeded).
- **Pagination**: For **list endpoints that paginate** (e.g. profile posts, saved posts, user search), use a composite cursor (`createdAt + id` or username-based where noted); response includes `nextCursor` when more pages exist. Request uses `cursor` and `limit` as documented per route. **Exception:** `GET /api/feed` returns a **fixed window** with **no** `nextCursor`.

### `GET /api/feed`

- **Query**: `mode` (optional): omit for **everyone** (all authors); `following` for posts by the current user and users they follow only. `type` (optional): filter to one media type — **`BOOK`**, **`ARTICLE`**, **`SONG`**, **`ALBUM`**, **`PODCAST`**, **`MOVIE`**, or **`LIVE`** (case-insensitive; invalid value → **400**). When `type` is set, the join to `media_items` is restricted so the **41**-post limit applies to matching posts only (not “take 41 mixed then filter”).
- **Logic**: Order `posts` by `created_at DESC, id DESC`. **No date filter.** Return at most **`FEED_POST_LIMIT` (41)** rows joined with `users` and `media_items`. Response: `{ items }` (same post + user + media_item shape as profile feed items; includes smile/save-related flags) — **no `nextCursor`**; not paginated.
- **Auth**: Required (internal user id). Feed is logged-in only.

### `GET /api/search/users`

- **Query**: `q` (required), `cursor` (optional, `username,id` composite), `limit` (optional, default 20, max 50).
- **Logic**: Search `users.username` with `ilike '%q%'`; exclude current user; order `username ASC, id ASC`; `nextCursor` when more matches exist.
- **Auth**: Required.

### `GET /api/users/suggestions`

- **Query**: `limit` (optional, default 20, max 50). Find friends uses **30**.
- **Logic**: Distinct users ordered by **most recent post** (scan `posts` newest-first in batches until enough unique authors). Users with no posts are not included. **No** `nextCursor` (single page).
- **Auth**: Required.

### `POST /api/posts`

- **Body**: Either
  - `mediaItemId` (existing), or
  - `media`: `{ mediaType, title, creator, externalUrl?, coverUrl?, source?, sourceId? }` for manual or Google Books client-side create.
- **Plus**: `note?: string`.
- **Validation**:
  - ARTICLE ⇒ `externalUrl` required and must be valid HTTPS URL.
  - If `mediaItemId`: ensure it exists.
  - If `media`: **Books from Google** → ensure `source === "google_books"` and `sourceId`; lookup `(source, sourceId)` first, reuse or create. **Manual** → `source`/`sourceId` null, check for deduplication by `mediaType + title + creator` (case-insensitive) before creating.
- **Weekly limit**: Count user's posts in current America/New_York week (see below). If `>= 3`, return `409` with clear message. Else create `Post`, return `201`.
- **Auth**: Required (Supabase). Resolve `userId` from session, store in `posts.userId`.

### `DELETE /api/posts/[id]`

- **Auth**: Required.
- **Logic**: Load post, verify `post.userId === currentUser.id`, then delete. Return `204` or `200`.
- **Effect**: Deleting frees a slot for the current week; next `POST` will use updated count.

### `GET /api/search/books?q=`

- **Query**: `q` (required), optionally `maxResults` (default 10).
- **Logic**: Call Google Books API, map to `{ id, title, creator, coverUrl, externalUrl }`. No DB writes.
- **Auth**: Optional (could require auth to avoid abuse).
- **Config**: Google Books API key in env (e.g. `GOOGLE_BOOKS_API_KEY`).

### `GET /api/users/[username]` (profiles)

- **Returns**: User profile (id, username, avatarColor, post count) and **cursor-paginated posts** (same shape as feed items). Use `cursor` + `limit` query params; `nextCursor` in response.
- **Auth**: Required. Profiles are logged-in only.

### `GET /api/users/[username]/following`

- **Query**: `cursor` (optional, composite `created_at,following_id` for stable pagination), `limit` (optional, default **20**, max **50**).
- **Returns**: `{ users, followingCount, nextCursor? }`. **`users`**: accounts the profile user follows (newest follow first), each with `id`, `username`, `avatar_color`, `created_at`, and **`isFollowing`** (whether the **current** user follows that account). **`followingCount`**: total follows for that profile user (all pages). Omit **`nextCursor`** when no more pages.
- **Auth**: Required.
- **Errors**: **404** if username not found.

### `GET /api/users/me`

- **Returns**: Current user from `public.users` table
- **Auth**: Required (uses `requireAuth()`)
- **Returns**: User info (id, email, username, avatarColor)

---

## Weekly Limit Implementation (America/New_York)

- **Storage**: Keep `posts.created_at` in UTC (database default). No application-level timezone storage.
- **Week definition**: Monday 00:00:00 through Sunday 23:59:59 **America/New_York**.
- **Library**: Use `date-fns` + `date-fns-tz` (or `luxon`).

**Algorithm:**
1. **Current time in ET**: `nowET = utcToZonedTime(new Date(), 'America/New_York')`
2. **Week boundaries in ET**:
   - `startOfWeek(nowET, { weekStartsOn: 1 })` → Monday 00:00:00 ET.
   - `endOfWeek(nowET, { weekStartsOn: 1 })` → Sunday 23:59:59.999 ET.
3. **Convert to UTC** for querying:
   - `startUTC = zonedTimeToUtc(weekStartET, 'America/New_York')`
   - `endUTC = zonedTimeToUtc(weekEndET, 'America/New_York')`
4. **Count**: Query posts where `userId` matches and `createdAt` is between `startUTC` and `endUTC`.
5. **On `POST /api/posts`**: If `count >= 3`, return `409` and a message like "You've reached your 3 posts per week limit. Resets Monday."
6. **On `DELETE`**: No change to limit logic; we always re-count on create. Deletion implicitly frees a slot.

**Edge cases**: DST transitions are handled by `date-fns-tz` when converting between ET and UTC. Use `createdAt` only (no separate "week" column).

---

## Pagination: Composite Cursor

Used by **profile timelines**, **profile following lists** (`GET /api/users/[username]/following`), **saved posts**, **user search**, and similar list endpoints—not by the **home feed** (`GET /api/feed`), which returns a fixed cap of recent posts with no `nextCursor`.

- **Strategy**: Composite cursor using `createdAt + id` (or username + id for search)
- **Order by**: `createdAt DESC, id DESC` (newest first, then by ID for tie-breaking) where applicable
- **Cursor format**: Implementation uses comma-separated or encoded values per route; see route handlers.
- **Response**: `{ items: [...], nextCursor?: ... }` (omit `nextCursor` when no more pages)
- **Default limit**: Often 20 items per page (configurable via `limit`, max 50 where enforced)

This ensures:
- Stable ordering even if posts have identical timestamps
- Works with time-ordered lists (newest first)
- Standard pattern for cursor pagination

---

## Media Item Deduplication

### Integration Items (Google Books, etc.)

- Before creating a `MediaItem` for a selected book, run query: `WHERE source = "google_books" AND sourceId = volume.id`
- If found, use that `id` for the new `Post`; otherwise create `MediaItem` then `Post`
- Database enforces unique constraint on `(source, sourceId)` when both are non-null

### Manual Entries

- For manual entries (`source`/`sourceId` null), enforce deduplication at application level
- Before creating, check: `WHERE mediaType = ? AND LOWER(title) = LOWER(?) AND LOWER(creator) = LOWER(?) AND source IS NULL`
- If found, reuse existing `MediaItem`; otherwise create new one
- Database unique constraint does not apply when `source`/`sourceId` are null

---

## Directory Structure

```
/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Feed (home) — client fetch → /api/feed
│   ├── (auth)/
│   │   ├── login/page.tsx      # Login: email → magic link
│   │   └── callback/route.ts  # Magic link callback handler
│   ├── onboarding/page.tsx     # Username setup (new users only)
│   ├── profile/[username]/page.tsx   # fetch → /api/users/[username]
│   ├── profile/[username]/following/page.tsx  # following list → /api/users/[username]/following
│   ├── api/
│   │   ├── feed/route.ts
│   │   ├── posts/
│   │   │   ├── route.ts        # POST
│   │   │   └── [id]/route.ts   # DELETE
│   │   ├── search/
│   │   │   └── books/route.ts
│   │   └── users/
│   │       ├── me/route.ts     # GET current user
│   │       └── [username]/route.ts   # GET profile
│   └── middleware.ts           # Session refresh
├── components/
│   ├── ui/                     # Buttons, inputs, cards
│   ├── feed/
│   │   ├── Feed.tsx            # Fetches /api/feed, renders list
│   │   ├── PostCard.tsx
│   │   └── CreatePostForm.tsx  # Submits to POST /api/posts only
│   ├── media/
│   │   ├── MediaTypeBadge.tsx
│   │   └── BookSearch.tsx      # Calls GET /api/search/books, then POST /api/posts
│   └── layout/
│       ├── Header.tsx
│       └── UserMenu.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser client helper
│   │   └── server.ts           # Server client helper
│   ├── auth.ts                 # Auth helpers (getCurrentUser, requireAuth, getSession)
│   ├── db.ts                   # Database helper wrapper
│   ├── api/
│   │   ├── weekly-limit.ts     # Backend-only: ET week, count, canCreatePost
│   │   ├── media.ts            # Backend-only: validate media, resolve/createMediaItem
│   │   └── errors.ts           # Standard API error shapes + helpers
│   ├── google-books.ts         # Used only by /api/search/books
│   └── types.ts                # Shared API request/response types
├── database/
│   └── schema.sql              # SQL schema with RLS policies
├── .env.local                  # Supabase credentials, GOOGLE_BOOKS_API_KEY
├── next.config.js
├── package.json
└── tsconfig.json
```

**Layering rules (mobile-ready):**
- **`app/api/**`**: Route Handlers only. All business logic either lives here or in `lib/api/` / `lib/google-books.ts`. No UI imports from `lib/api/` or `lib/google-books`.
- **`lib/api/`**: Backend-only. Used **exclusively** by API routes. `weekly-limit`, `media` validation, `errors` — never import these from components or pages.
- **`lib/supabase/`**, **`lib/auth.ts`**, **`lib/db.ts`**: Used by API routes (and auth middleware). Keep Supabase usage out of UI; pages never touch database directly for feed/posts.
- **`lib/types.ts`**: Shared request/response types. Safe for both API and UI; future mobile app can reuse via a shared package if you extract one.
- **Components**: Only `fetch` to `/api/*`. No Supabase, no `weekly-limit`, no media validation. Handle loading, errors, and form state only.

---

## Google Books Integration

- **API**: `https://www.googleapis.com/books/v1/volumes?q=...&maxResults=...`
- **Store**:
  - `source = "google_books"`
  - `source_id` = `volume.id`
  - `title` from `volume.volumeInfo.title`
  - `creator` from `volume.volumeInfo.authors?.join(", ")` or `"Unknown"`
  - `cover_url` from `volume.volumeInfo.imageLinks?.thumbnail`
  - `external_url` from `volume.volumeInfo.previewLink` or `infoLink`
- **Deduplication**: Before creating a `MediaItem` for a selected book, run query `WHERE source = "google_books" AND sourceId = volume.id`. If found, use that `id` for the new `Post`; otherwise create `MediaItem` then `Post`.

---

## Key Decisions Made

### Pagination
- **Strategy**: Composite cursor (`createdAt + id`)
- **Order**: `createdAt DESC, id DESC`
- **Cursor format**: Base64-encoded `{createdAt, id}`
- **Default limit**: 20 items per page

### Error Handling
- **Format**: `{ error: "message", code: "optional_code" }`
- **Codes**: Define as we go (no predefined list)
- **Status codes**: `400` (validation), `401` (unauthenticated), `403` (forbidden), `404` (not found), `409` (conflict, e.g. weekly limit)

### Weekly Limit
- **Limit**: 3 posts per week (America/New_York timezone)
- **Reset**: Monday 00:00:00 ET
- **Deletion**: Frees slot immediately (recounted on next create)
- **Error**: `409` with message "You've reached your 3 posts per week limit. Resets Monday."

### Media Validation
- **ARTICLE type**: `externalUrl` required and must be valid HTTPS URL
- **Validation**: Return `400` error if missing or invalid

### Post Deletion
- **Behavior**: Keep `media_item` when deleting post (other posts might reference it)
- **Relationship**: `onDelete: Restrict` on `media_item` foreign key

### Username
- **Uniqueness**: Case-insensitive ("Alex" and "alex" are the same)
- **Length**: 3-20 characters
- **Format**: Alphanumeric + underscore only (no spaces)
- **Reserved**: `moss`, `api`, `admin`, `support`

### Feed Visibility
- **Access**: Logged-in only
- **Behavior**: Unauthenticated users cannot see feed or profiles
- **Redirect**: Redirect to login if not authenticated

### Metadata Field
- **Type**: JSONB (completely flexible)
- **Usage**: Store integration-specific data (e.g. Google Books `publishedDate`, `pageCount`)
- **No predefined keys**: Completely flexible structure

---

## Outstanding Questions

### Avatar & UI
1. **Warm color palette**: Should we define a specific set of hex colors (e.g., 8-10 warm tones), or do you have a preferred palette? Examples: `#E07C54`, `#D4A574`, `#C97D60`, etc.

### Weekly Limit Edge Cases
2. **Exactly 3 posts**: If a user has exactly 3 posts in the current week, should the error message be "You've reached your limit" or "You've exceeded your limit"? (Current logic: `>= 3` means 3 is the limit.)

3. **Week boundary behavior**: If a user creates 3 posts on Sunday and deletes one, can they create a new one on Sunday, or must they wait until Monday?

### Onboarding & User Flow
4. **Returning users**: If a user who already has a `public.users` row logs in again, do they skip onboarding and go straight to the feed?

5. **Username change**: Can users change their username after onboarding, or is it permanent?

### Database & RLS
6. **RLS for media_items**: Should `media_items` be publicly readable (for feed display), or only readable by authenticated users?

7. **User profile updates**: Can users update their `avatarColor` after onboarding, or is it set once?

### API Details
8. **Home feed size**: The feed uses a **fixed cap** (`FEED_POST_LIMIT`, currently 41), not cursor pagination. Default `limit` for **other** list APIs (search, profile, saved) remains typically 20 unless overridden.

9. **Empty states**: The doc mentions empty states in polish phase. Should we define what these look like now, or handle later?

### Integration
10. **Future integrations**: Beyond Google Books, are there other media integrations planned (movies, music, etc.) that we should account for in the schema?

---

## Summary

- **Architecture**: API-first, mobile-ready. All business logic in API routes (or `lib/api/`). UI only fetches/submits via REST. No Server Actions or RSC-only mutation paths for feed/posts. Session-based auth for web + future native.

- **Auth**: Supabase Auth; email + magic link (no passwords). Make account (username + email) → magic link sent → onboarding / set up profile (new users) → feed. Login → magic link → feed. Username: 3–20 chars, no spaces, case-insensitive, reserved `moss`/`api`/`admin`/`support`.

- **Avatar**: `avatarColor` (hex); v0 random warm palette, v2 color picker. No image upload.

- **Database**: Single `media_items` table, unique `(source, source_id)` for integrations; manual dedupe by type+title+creator. ARTICLE `externalUrl` required, HTTPS validated.

- **Visibility**: Feed and profiles **logged-in only**. No invite-only.

- **APIs**: `GET /api/feed` (fixed recent window, no cursor), `POST /api/posts`, `DELETE /api/posts/[id]`, `GET /api/search/books?q=`, `GET /api/search/users`, `GET /api/users/suggestions`, `GET /api/users/[username]`, `GET /api/users/me`. Cursor pagination on profile/saved/search lists as implemented. Stable JSON contracts; errors as `{ error, code }`.

- **Weekly limit**: UTC `created_at`; America/New_York week via `date-fns-tz`; count on each create; reject if `>= 3`; delete frees slot.

- **Scaffolding**: App Router; `lib/api/` backend-only (weekly-limit, media, errors); `lib/types` shared; UI never imports `lib/api/` or Supabase directly for mutations.

This keeps Moss V0 minimal while ensuring the same REST API can power the web app now and a native mobile app later without rework.
