# Deploy mallGuide

Three pieces — **Neon** for the database, **Railway** for the API, **Vercel** for the web app. End-to-end takes ~25 minutes the first time.

---

## 1. Database — Neon

1. Sign up at <https://neon.tech>, create a new project.
2. In the project's **SQL Editor** run once:

   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   CREATE EXTENSION IF NOT EXISTS postgis;
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   ```

   pgvector + PostGIS + trigram are all supported on Neon out of the box.

3. Copy your **pooled** connection string (Settings → Connection Pooling → "Pooled" tab). It looks like:

   ```
   postgresql://user:pass@ep-foo-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

   You'll use this everywhere as `DATABASE_URL`.

4. Apply migrations from your local machine:

   ```bash
   DATABASE_URL="postgresql://user:pass@…/neondb?sslmode=require" pnpm migrate
   ```

   Applies migrations `0000`–`0008` idempotently. If pgvector wasn't enabled in step 2, `0008` is skipped with a warning — semantic search will fall back to keyword search until you re-run.

5. (Optional) seed CHIC Kigali demo data:

   ```bash
   DATABASE_URL="…" node scripts/seed.js
   DATABASE_URL="…" node scripts/seed-products.js
   ```

6. Create your super-admin login:

   ```bash
   # Generate a bcrypt hash for your password
   cd apps/api && node -e "console.log(require('bcryptjs').hashSync('YOUR_STRONG_PASSWORD', 10))"
   ```

   Then in Neon SQL editor:

   ```sql
   INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
   VALUES ('root@mallguide.rw', '$2a$10$paste-hash-here', 'Root', 'Admin', 'super_admin', true);
   ```

---

## 2. API — Railway

1. <https://railway.app> → **New Project** → **Deploy from GitHub** → pick your repo.
2. Railway auto-detects [railway.json](railway.json). Verify the **build command** runs:
   ```
   corepack enable && pnpm install --frozen-lockfile && pnpm --filter @mallguide/shared build && pnpm --filter @mallguide/api build
   ```
3. **Variables** tab — add:

   | Key                              | Value                                                      |
   |----------------------------------|------------------------------------------------------------|
   | `DATABASE_URL`                   | Your Neon pooled URL from step 1                          |
   | `WEB_URL`                        | `https://mallguide.vercel.app` (set after step 3 below)   |
   | `JWT_SECRET`                     | `openssl rand -hex 64`                                     |
   | `JWT_REFRESH_SECRET`             | `openssl rand -hex 64` (different value)                  |
   | `JWT_EXPIRES_IN`                 | `15m`                                                      |
   | `JWT_REFRESH_EXPIRES_IN`        | `7d`                                                       |
   | `NODE_ENV`                       | `production`                                               |
   | `ANTHROPIC_API_KEY`              | from <https://console.anthropic.com>                       |
   | `ANTHROPIC_MODEL`                | `claude-sonnet-4-6`                                        |
   | `GOOGLE_CLIENT_ID`               | OAuth Web Client ID from Google Cloud Console              |

4. Click **Deploy**. First build takes ~3 min. Once live you'll get a domain like `mallguide-api.up.railway.app`.

5. Verify with:
   ```bash
   curl https://mallguide-api.up.railway.app/health
   # → {"status":"ok","timestamp":"…"}
   ```

---

## 3. Web — Vercel

1. <https://vercel.com> → **Add New** → **Project** → pick the same repo.

2. **Root Directory** → `apps/web`

3. Vercel reads [apps/web/vercel.json](apps/web/vercel.json) and uses the monorepo-aware build command. Framework auto-detects as Next.js.

4. **Environment Variables** — add **before** the first deploy:

   | Key                                    | Value                                                     |
   |----------------------------------------|-----------------------------------------------------------|
   | `NEXT_PUBLIC_API_URL`                  | `https://mallguide-api.up.railway.app/trpc`              |
   | `NEXT_PUBLIC_GOOGLE_CLIENT_ID`         | Same Google client id as Railway                          |

5. **Deploy**. First build ~2 min.

6. Once you have your Vercel domain (e.g. `mallguide.vercel.app`), go back to Railway → **Variables** → set `WEB_URL=https://mallguide.vercel.app` so the API's CORS allowlist accepts it. (Vercel preview deploys at `*.vercel.app` are accepted automatically by the regex in [apps/api/src/main.ts](apps/api/src/main.ts).)

---

## 4. Google OAuth (optional)

Skip if you only want email/password login.

1. <https://console.cloud.google.com> → new OAuth Web Client.
2. **Authorized JavaScript origins**: `https://mallguide.vercel.app` (+ `http://localhost:3000` for dev).
3. **Authorized redirect URIs**: (Google Identity Services uses popups, no redirect URI needed for the in-app button).
4. Paste the client id into both `GOOGLE_CLIENT_ID` (Railway) and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (Vercel).

---

## Smoke test the deploy

1. Visit `https://mallguide.vercel.app` → landing page loads with the mallGuide logo.
2. Visit `/login` → sign in with `root@mallguide.rw` / your password.
3. You'll land on `/platform` (super_admin landing). Check overview KPIs render — confirms the API is reachable.
4. Click **Switch to mall** in the bottom of the sidebar → `/mall` opens with the building list.
5. Visit `/shop/<a-shop-uuid>` → public storefront renders.
6. Tap the floating **Ask yoGuide** pill bottom-right → ask "Where can I buy a laptop?" → AI replies (only if `ANTHROPIC_API_KEY` is set).

---

## What still doesn't work in production

(Honest list — not blockers for sharing the demo.)

- **MoMo payments**: dev driver always returns `SUCCESSFUL`. Real MTN MoMo wiring not done.
- **Email delivery**: forgot-password / invitation emails are console-logged only.
- **BullMQ workers**: rent-due cron, scheduled social posts, embedding refresh on writes — all manual.
- **Buy & Try delivery**: the 4th surface (delivery-personnel PWA) isn't built.
- **Tenant invitations**: no UI flow. Tenants can't claim accounts via email yet — manual SQL only.

See the project status section in `CLAUDE.md` (if you have one) for the full picture.

---

## Troubleshooting

**`Failed to fetch` in the browser** → API is down, CORS rejected, or `NEXT_PUBLIC_API_URL` is wrong. Check Railway logs.

**`extension "vector" is not available`** → Run the `CREATE EXTENSION` block from step 1 again in Neon SQL Editor.

**Login succeeds but no data shows on /mall** → You're signed in as a `public` role. Promote via Neon SQL: `UPDATE users SET role='super_admin' WHERE email='you@…';`

**Vercel build fails on `@mallguide/shared`** → Vercel must run the workspace install. Confirm the buildCommand in [apps/web/vercel.json](apps/web/vercel.json) reads `cd ../..` to get to repo root.

**Railway build fails on `pnpm not found`** → Make sure `corepack enable` is in the build command — Nixpacks doesn't auto-install pnpm.
