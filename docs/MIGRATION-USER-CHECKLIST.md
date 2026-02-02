# Migration: Step-by-step checklist for one user

Use this to verify Clerk and Supabase are aligned for **one** user (the one you sign in as).

---

## 1. Clerk: What is this user’s id and email?

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → your application → **Users**.
2. Find the user you sign in with (search by email if needed).
3. Note:
   - **User ID** (e.g. `user_396NaRh1JSNRlFHnFl12CroaQwk`). This is the **Clerk user id**.
   - **Primary email** (or first email). Must match what you use to sign in.
4. Confirm:
   - The user has at least one **email address**.
   - One email is set as **primary** (or we use the first one in code).
   - There are no duplicate users with the same email (would cause wrong id to be used).

**If there is no primary email:** Add/verify an email in Clerk and set it as primary. The app uses this to look up your row in Supabase.

---

## 2. Supabase: What’s in `public.users`?

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Table Editor**.
2. Open the **users** table.
3. Find the row that should be **you** (by email or username).
4. Note:
   - **id** – must be the **same** as the Clerk User ID from step 1.
   - **email** – must match the Clerk primary email (same string; casing can differ if we use case-insensitive lookup).
   - **username** – your app username.

**Alignment:**

- If **id** in this row **equals** the Clerk User ID from step 1 → you’re aligned; the app should recognize you.
- If **id** is **different** (e.g. an old Supabase Auth id or another Clerk id) → the app won’t find you by Clerk id. The reconcile endpoint is meant to fix this by “repointing” this row to your current Clerk id.

---

## 3. Why you might still see “add username”

- **Reconcile not run or not finding you**
  - Reconcile runs only when you hit **onboarding** after sign-in (when `/api/users/me` returns 404).
  - It looks up `public.users` by your **Clerk primary email**. If Clerk has no primary email, or the email in Supabase doesn’t match (e.g. typo, different address), no row is found and reconcile does nothing.
- **Clerk**
  - User has no email, or primary email not set.
  - You’re signed in as a **different** Clerk user than the one whose id is in Supabase (e.g. two accounts with same email).
- **Supabase**
  - No row in `public.users` for your email → nothing to reconcile; you really are a new user and need to pick a username.
  - Row exists but **id** is wrong and reconcile didn’t run or didn’t find the row (see above).

---

## 4. Quick alignment fix (this one user)

If you confirmed:

- Clerk User ID = `user_396NaRh1JSNRlFHnFl12CroaQwk` (or your actual id from step 1).
- Supabase has a row for your email but with a **different** `id`.

Then either:

- **A) Use the app:** Sign in → you should be sent to onboarding → the app will call `POST /api/auth/reconcile-migration`. That endpoint looks up your row by email and repoints it to your current Clerk id. After that, reload or go to feed; you should be recognized.
- **B) Fix in SQL (one-time):** In Supabase SQL Editor, for your email only (replace with your real values):

```sql
-- Set @clerk_id and @your_email
-- Then run (conceptually; use your actual id and email):

-- 1) Insert new row with Clerk id (copy from existing row with your email)
INSERT INTO users (id, email, username, avatar_color, phone_number, first_name, last_name, created_at)
SELECT 'user_396NaRh1JSNRlFHnFl12CroaQwk', email, username, avatar_color, phone_number, first_name, last_name, created_at
FROM users WHERE email = 'your@email.com' LIMIT 1;

-- 2) Repoint posts and saves to the new id (replace OLD_ID with the id that was in the row before)
UPDATE posts SET user_id = 'user_396NaRh1JSNRlFHnFl12CroaQwk' WHERE user_id = 'OLD_ID';
UPDATE saves SET user_id = 'user_396NaRh1JSNRlFHnFl12CroaQwk' WHERE user_id = 'OLD_ID';

-- 3) Delete the old row
DELETE FROM users WHERE id = 'OLD_ID';
```

Use your real Clerk user id and email; get `OLD_ID` from the current row in `users` for that email.

---

## 5. After you run the app again (with new logs)

Reproduce: sign in → go to onboarding (or land there after login). Then check:

- Debug log **reconcile-migration:entry** – was reconcile called? What `userId`?
- **reconcile-migration:afterClerk** – what `primaryEmail`? Empty means Clerk isn’t giving an email.
- **reconcile-migration:emailLookup** – did we find a row by that email? If `found: false`, Clerk email and Supabase email don’t match or there’s no row for that email.

That will show exactly where the flow stops for this user.
