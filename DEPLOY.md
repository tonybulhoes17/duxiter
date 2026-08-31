# Duxiter — Deploy to Vercel

## A. Push the code to GitHub

1. Create a **new private repo** on <https://github.com/new> named `duxiter`
   (don't add a README / .gitignore / license — the repo must be empty).
2. In the project folder:

   ```bash
   cd "C:\skill code\duxiter"
   git add .
   git commit -m "Duxiter MVP"
   git branch -M main
   git remote add origin https://github.com/<your-username>/duxiter.git
   git push -u origin main
   ```

## B. Import into Vercel

1. <https://vercel.com/new> → **Import** the `duxiter` repo.
2. Framework preset: **Next.js** (auto-detected). Leave build/output settings default.
3. **Before clicking Deploy**, expand **Environment Variables** and add every row
   from the table below (Production + Preview).
4. Deploy. You'll get a URL like `https://duxiter-xxxx.vercel.app`.

## C. Environment variables (Vercel → Settings → Environment Variables)

| Name | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | *(from `.env.local`)* | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(from `.env.local`)* | |
| `SUPABASE_SERVICE_ROLE_KEY` | *(from `.env.local`)* | secret |
| `NEXT_PUBLIC_APP_URL` | `https://<your-vercel-domain>` | **must be the real deployed URL** |
| `NEXT_PUBLIC_PARTNERS_ENABLED` | `false` | |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | *(from `.env.local`)* | |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` | |
| `STRIPE_SECRET_KEY` | `sk_test_…` | secret |
| `STRIPE_WEBHOOK_SECRET` | *(from step E)* | secret — set this AFTER first deploy |
| `NEXT_PUBLIC_PIX_ENABLED` | `false` | flip to `true` once the Stripe account is activated |
| `OPENAI_API_KEY` | *(from `.env.local`)* | secret |
| `OPENAI_ITINERARY_WEB_SEARCH` | `true` | |
| `FX_USD_BRL_FALLBACK` | `5.40` | |
| `RESEND_API_KEY` | *(optional)* | leave blank until you set up Resend |
| `GOOGLE_VISION_API_KEY` | *(optional)* | leave blank; camera ID works on OpenAI alone |

After adding/changing env vars, **redeploy** (Vercel → Deployments → ⋯ → Redeploy).

## D. Make Google login work

1. **Supabase → Authentication → URL Configuration**
   - **Site URL**: `https://<your-vercel-domain>`
   - **Redirect URLs**: add `https://<your-vercel-domain>/**`
     (keep `http://localhost:3000/**` too for local dev)
2. **Google Cloud → APIs & Services → OAuth consent screen**: if it says
   "Testing", click **Publish app** (instant for email/profile scopes — no
   Google review needed). Otherwise only added test users can sign in.
3. Google's OAuth client itself needs **no change** — Supabase's callback URL
   (`https://<ref>.supabase.co/auth/v1/callback`) is unchanged.

## E. Stripe webhook (production)

The Stripe CLI is only for local dev. For the deployed site:

1. **Stripe Dashboard (test mode) → Developers → Webhooks → Add endpoint**
   - URL: `https://<your-vercel-domain>/api/stripe/webhook`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
     `checkout.session.async_payment_failed`, `checkout.session.expired`,
     `charge.refunded`
2. Copy the endpoint's **Signing secret** (`whsec_…`) → set `STRIPE_WEBHOOK_SECRET`
   in Vercel → redeploy.

## F. Google Maps key — allow the new domain

**Google Cloud → Credentials → your Maps key → Application restrictions →
HTTP referrers** → add `https://<your-vercel-domain>/*`.

## G. Test on your phone

Open `https://<your-vercel-domain>` on the phone. You can "Add to Home Screen"
(PWA). Test: browse, Google login, buy a tour (test card `4242 4242 4242 4242`),
play a tour, generate an AI itinerary, museum camera.
