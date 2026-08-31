# Duxiter — Setup (Milestone 1)

## Status

**Done (autonomous):** project scaffold, design system, i18n (pt/en/es), Supabase
clients + middleware, auth pages + OAuth callback + onboarding, landing / cities /
city / tour-detail pages, navigation, PWA icons, database schema + seed.
`npm run build` passes. The app already boots with **no** environment variables
(it just shows empty states).

**Your turn:** the steps below. Everything is "click in a dashboard + copy a
value" — no code.

---

## 1. Create the Supabase project

1. Go to <https://supabase.com/dashboard> → **New project**.
2. Name it `duxiter`, pick a region close to you, set a strong database password
   (save it in your password manager).
3. Wait ~2 min for it to provision.

## 2. Copy the three keys into `.env.local`

In the project: **Settings → API**. Copy these into
`C:\skill code\duxiter\.env.local`:

| Dashboard field | `.env.local` variable |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` key | `SUPABASE_SERVICE_ROLE_KEY` |

> The `service_role` key bypasses all security — it is only ever used server-side.
> Never paste it anywhere client-facing.

## 3. Run the SQL

**SQL Editor → New query**, then:

1. Paste the whole of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
2. Paste the whole of [`supabase/seed.sql`](supabase/seed.sql) → **Run**.

You should see `Success. No rows returned`. Under **Table Editor** you'll now have
`cities` (3 rows), `tours` (6 rows), `tour_stops`, etc.

## 4. Create the storage buckets

**Storage → New bucket** (do this twice):

| Bucket name | Public? |
|---|---|
| `duxiter-public` | ✅ Public |
| `duxiter-audio` | ❌ Private (leave unchecked) |

(Nothing is uploaded to them in Milestone 1 — this just prepares them.)

## 5. Enable Google login

**Authentication → Providers → Google → Enable.** You need a Google OAuth client:

1. <https://console.cloud.google.com> → create/select a project.
2. **APIs & Services → OAuth consent screen** → External → fill the minimum
   (app name, your email) → Save.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID →
   Web application**.
4. **Authorized redirect URI** — copy the exact "Callback URL" Supabase shows on
   the Google provider page (looks like
   `https://<project-ref>.supabase.co/auth/v1/callback`).
5. Copy the generated **Client ID** and **Client secret** back into the Supabase
   Google provider form → Save.

Apple login can wait (it needs a paid Apple Developer account) — the button will
just show an error until then, which is fine for now.

### Also in Supabase Auth → URL Configuration
- **Site URL:** `http://localhost:3000`
- **Redirect URLs:** add `http://localhost:3000/auth/callback`

## 6. Run it

```bash
cd "C:\skill code\duxiter"
npm run dev
```

Open <http://localhost:3000>. You should see the 3 seeded cities on the landing
page, be able to open a city, open a tour, and sign up / log in.

---

## Recommended: upgrade Node to 22 LTS

You're on Node 20.18. `@supabase/supabase-js` now prints a deprecation warning and
will drop Node 20 support soon; Vercel also defaults to Node 22. Install Node 22
LTS from <https://nodejs.org> (or `nvm install 22 && nvm use 22`), then
`rm -rf node_modules && npm install` in the project.

## Milestone 2 — Google Maps API key (for the street tour player)

The tour players are built. The **museum player works fully without any extra key**.
The **street player** shows a fallback message until you add a Maps key:

1. <https://console.cloud.google.com> → same project you used for OAuth.
2. **Billing** must be enabled on the project (Google gives a large free monthly
   Maps credit; a card is required but normal usage stays free).
3. **APIs & Services → Library** → enable **"Maps JavaScript API"**.
4. **APIs & Services → Credentials → Create credentials → API key**.
5. Click the new key → **Restrict key**:
   - Application restrictions → **HTTP referrers** → add `http://localhost:3000/*`
     and later your production domain `https://duxiter.com/*`.
   - API restrictions → **Restrict key** → select **Maps JavaScript API** only.
6. Put it in `.env.local`:

   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
   ```

7. Restart `npm run dev`. The street player now shows the dark map with numbered
   pins, the dashed route line and your live location.

## Milestone 4 — Stripe (test mode)

Prices are stored in USD (reference) and customers are **always charged in BRL**
(live USD→BRL rate, fallback `FX_USD_BRL_FALLBACK` in `.env.local`).

### 1. Create the account
1. <https://dashboard.stripe.com/register> — sign up.
2. You do **not** need to activate/verify the account for test mode.
3. Top-left, make sure the **"Test mode"** toggle is ON (orange).
4. **Settings → Business → Account details** → set the country to **Brazil** if
   possible. PIX is only offered by Brazilian Stripe accounts. If you can't set
   BR yet, you can still test with **card only** and add PIX later.

### 2. Keys → `.env.local`
**Developers → API keys** (in test mode):

| Stripe field | `.env.local` |
|---|---|
| Publishable key (`pk_test_…`) | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Secret key (`sk_test_…`) | `STRIPE_SECRET_KEY` |

### 3. Enable PIX (test)
**Settings → Payment methods** → find **Pix** → turn it on. (Only appears for
Brazilian accounts.)

### 4. Webhook secret — needed for access to unlock after payment

For **local** testing, use the Stripe CLI (it tunnels Stripe events to your machine):

1. Install: <https://docs.stripe.com/stripe-cli> (`scoop install stripe` on Windows, or download the .exe)
2. In a **second terminal** (keep `npm run dev` running in the first):

   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

3. It prints `Ready! Your webhook signing secret is whsec_xxxxx` — put that in:

   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

4. Restart `npm run dev`. Leave `stripe listen` running while you test.

(For the deployed site later, you'll instead add a webhook endpoint in the Stripe
dashboard pointing at `https://your-domain/api/stripe/webhook` and use that
endpoint's signing secret.)

### 5. Test it
- Card: number `4242 4242 4242 4242`, any future date, any CVC, any ZIP.
- PIX: Stripe's test checkout shows a "simulate payment" button.
- After paying you're sent back to the tour page and access unlocks (a couple of
  seconds; PIX confirms via the `async_payment_succeeded` webhook).
- Discount codes for testing already seeded: `WELCOME20` (20% off), `FREEBIE`
  (100% off — skips Stripe entirely).

## Later milestones (keys you'll need, not yet)

| Milestone | Service | Vars |
|---|---|---|
| Museum camera ID | Google Vision API | `GOOGLE_VISION_API_KEY` |

## Confirmation email (Resend) — optional

The purchase-confirmation email is built and no-ops until configured.
1. Sign up at <https://resend.com> (free: 3,000 emails/month).
2. **API Keys → Create** → put it in `.env.local` as `RESEND_API_KEY`.
3. Until you verify a domain, emails only send to your own Resend account
   address, from `onboarding@resend.dev`. To send to anyone: **Domains → Add**
   `duxiter.com`, add the DNS records, then set
   `DUXITER_EMAIL_FROM="Duxiter <no-reply@duxiter.com>"`.

## Admin access

Your account (`tonybulhoes17@gmail.com`) is already an admin — visit **`/admin`**.

To make another user an admin, add a row to `admin_users` with their `auth.users`
id (SQL Editor):

```sql
insert into admin_users (id, role)
select id, 'admin' from auth.users where email = 'someone@example.com';
```

## Dev helpers (delete before deploying)

- `src/app/api/devtools/` — creates confirmed test users.
- `scripts/gen-test-audio.mjs` — uploads placeholder WAV narration for every stop
  to the `duxiter-audio` bucket. Re-run any time after re-seeding.
