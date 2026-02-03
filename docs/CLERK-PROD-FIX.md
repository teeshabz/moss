# Fix: Clerk login not showing in production (clerk.moss-app.co not resolving)

Your app is trying to load Clerk from `https://clerk.moss-app.co`, which doesn’t resolve (`ERR_NAME_NOT_RESOLVED`). Per [Clerk’s production deployment guide](https://clerk.com/docs/guides/development/deployment/production#dns-records) and [changing domains guide](https://clerk.com/docs/guides/development/deployment/changing-domains), use one of these approaches.

---

## Option A: Remove custom subdomain (fastest – use Clerk’s default host)

You don’t need a custom domain for Clerk to work. Removing the subdomain makes Clerk use its default Frontend API (e.g. `*.clerk.accounts.dev`).

### Steps

1. **Open Clerk Domains**
   - Go to **[Clerk Dashboard → Domains](https://dashboard.clerk.com/~/domains)** (click **Domains** in the **left sidenav**, not inside a specific domain).
   - Make sure you’re in the **Production** instance (top of dashboard).

2. **Find “Change subdomain”**
   - On the **main** Domains page (where you see your domain `moss-app.co` and tabs like Configure / Satellites / Add-on), **scroll down**.
   - Per [Clerk’s changing domains guide](https://clerk.com/docs/guides/development/deployment/changing-domains#set-change-or-remove-subdomain): the **“Change subdomain”** section is on this page; it only appears if a subdomain is configured.
   - If you don’t see it: try the **Configure** tab, or look for a **“Change domain”** / **“Change subdomain”** link or section elsewhere on the same Domains page (not inside the DNS Configuration / CNAME list).

3. **Remove the subdomain**
   - In **“Change subdomain”**, use the option to **remove** or **clear** the subdomain so Clerk uses its default Frontend API host.

4. **Publishable Key**
   - Per [changing domains](https://clerk.com/docs/guides/development/deployment/changing-domains): after changing/removing domain or subdomain, a **new Publishable Key** may be generated.
   - If Clerk shows a new key: copy it, update **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`** in Vercel (Environment Variables), then **redeploy**.

5. **Verify**
   - Hard refresh your production site (e.g. `https://moss-app.co`) or open in incognito.
   - Login should load; the browser will request Clerk from Clerk’s default host, not `clerk.moss-app.co`.

**If you still don’t see “Change subdomain”:** Clerk’s UI may vary. Use **Option C (Proxy)** below instead; it doesn’t require removing the domain.

---

## Option B: Keep custom domain (add DNS records)

If you want to keep using `clerk.moss-app.co`:

1. **See required DNS records**
   - Go to **[Clerk Dashboard → Domains](https://dashboard.clerk.com/~/domains)** (Production).
   - You’ll see the required CNAMEs (e.g. `clerk` → `frontend-api.clerk.services`).

2. **Add records at your DNS provider**
   - Where `moss-app.co` is managed (Vercel Domains, Cloudflare, etc.), add each CNAME Clerk lists.
   - Example for Frontend API: **Name** `clerk`, **Target** `frontend-api.clerk.services`.

3. **Wait and verify**
   - DNS can take up to 48 hours to propagate ([Clerk docs](https://clerk.com/docs/guides/development/deployment/production#dns-records)).
   - In Clerk Domains, use **“Verify configuration”** (or similar) until records show as verified.

4. **Deploy certificates**
   - When the dashboard shows that steps are complete, use the **“Deploy certificates”** button if it appears ([production guide](https://clerk.com/docs/guides/development/deployment/production#deploy-certificates)).

---

## Option C: Use the proxy (no delete, no DNS)

You can keep the custom domain and use **“Set proxy configuration”** on the same Frontend API section. Clerk will then load from your app (e.g. `https://moss-app.co/__clerk/`) instead of `clerk.moss-app.co`. No DNS and no “remove subdomain” needed.

### 1. In Clerk Dashboard

- On the **Frontend API** section (where `clerk.moss-app.co` is shown), click **“Set proxy configuration”**.
- Enter proxy URL: **`https://moss-app.co/__clerk/`** (trailing slash).
- Save / Use proxy.

### 2. In your app (already done in this repo)

- **Middleware** rewrites `/__clerk/*` to Clerk’s Frontend API with the required headers.
- **Env:** Set **`NEXT_PUBLIC_CLERK_PROXY_URL=https://moss-app.co/__clerk/`** in Vercel (and in `.env.local` for local). Redeploy after adding the env var.

### 3. Verify

- Hard refresh production; Clerk should load from `https://moss-app.co/__clerk/...` and login should work.

See [Proxying the Clerk Frontend API](https://clerk.com/docs/guides/dashboard/dns-domains/proxy-fapi).

---

## Component paths (Sign In / Sign Up / Sign out)

So redirects don’t go to `accounts.moss-app.co` (which also may not resolve):

- **Configure → Paths** (or **Component paths**): set Sign In, Sign Up, and Sign out to **“application domain”** with paths:
  - Sign in: `/login`
  - Sign up: `/signup`
  - After sign out: `/` or `/login`

---

## References

- [Deploy your Clerk app to production](https://clerk.com/docs/guides/development/deployment/production) – API keys, DNS, deploy certificates.
- [DNS records](https://clerk.com/docs/guides/development/deployment/production#dns-records) – Where to see required records (Domains page).
- [Change domain or subdomain](https://clerk.com/docs/guides/development/deployment/changing-domains) – Change/remove domain or subdomain; **“Change subdomain”** is where you remove the custom subdomain.
