# Family Ledger — with accounts

A private, per-user version of the Family Ledger expense tracker, built on
[Supabase](https://supabase.com) (free tier) for authentication and the
database. Everything below uses only free tools.

## Why this had to move out of the chat artifact

Real login (Google sign-in, email verification, password reset) needs a
backend that can register OAuth redirect URLs and send email — a sandboxed
in-chat preview can't do that. This is a normal small React app (Vite) that
you run locally or deploy for free.

## 1. Create a free Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account and
   a new project.
2. In the project dashboard, open **SQL Editor**, paste the contents of
   `supabase/schema.sql`, and run it. This creates the `profiles`,
   `expenses`, and `user_settings` tables, turns on row-level security so
   one user can never read another's rows, and sets up a trigger that
   provisions a profile + default settings the moment someone signs up.
3. Open **Project Settings → API**. Copy the **Project URL** and the
   **anon public key**.
4. Copy `.env.example` to `.env` and paste those two values in:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

## 2. Turn on email/password auth (on by default)

Supabase email/password auth and email verification are enabled out of the
box on the free tier. In **Authentication → Settings**, you can:
- Confirm "Enable email confirmations" is on (it is by default) — this is
  what powers the "check your email" step after signup.
- Customize the confirmation and password-reset email templates if you want.

## 3. Turn on Google sign-in (free)

1. In Supabase, go to **Authentication → Providers → Google** and enable it.
2. Create OAuth credentials in the
   [Google Cloud Console](https://console.cloud.google.com/) (free — no
   billing needed for OAuth login): a new project, then
   **APIs & Services → Credentials → Create OAuth client ID** (type: Web
   application).
3. Add the redirect URI Supabase shows you (something like
   `https://your-project-ref.supabase.co/auth/v1/callback`) to the Google
   OAuth client's "Authorized redirect URIs".
4. Paste the Google Client ID and Client Secret into the Supabase Google
   provider settings and save.

If you skip this step, everything else (email/password login, signup,
verification, reset, the dashboard) still works — the Google button just
won't complete until it's configured.

## 4. Run it locally

```bash
npm install
npm run dev
```

Open the printed local URL. Create an account, check your email for the
confirmation link, log in, and you'll land on your own private dashboard.

## 5. Deploy for free

Push this folder to a GitHub repo, then import it into
[Vercel](https://vercel.com) (free tier) or [Netlify](https://netlify.com)
(free tier):
- Build command: `npm run build`
- Output directory: `dist`
- Add the two `VITE_SUPABASE_*` environment variables in the host's project
  settings (same values as your `.env`).

Once deployed, go back to Supabase **Authentication → URL Configuration**
and set the **Site URL** (and add it under **Redirect URLs**) to your live
domain, so password-reset and email-confirmation links point to the right
place.

## What's in the database

- **profiles** — id, full_name, email, created_at. Created automatically on
  signup.
- **expenses** — id, user_id, amount, category, description, date,
  created_at. Row-level security means a query only ever returns the
  signed-in user's own rows.
- **user_settings** — user_id, monthly_budget, savings_goal. One row per
  user, created automatically on signup with the same defaults the original
  app used (₱50,000 budget, ₱5,000 savings goal).

## What changed in the app

- New screens: log in, create account, forgot password, "check your email",
  set new password.
- Password fields have a show/hide toggle.
- Settings screen now has an **Account** section at the top (name, email,
  log out) above the existing budget/savings goal fields — everything else
  (dashboard, add expense, history, reports, the 13 categories) is unchanged
  from the version you already had.
- All expense/budget/savings data now belongs to `auth.uid()` in Supabase
  instead of local browser storage, so each person who signs up gets their
  own private ledger.
