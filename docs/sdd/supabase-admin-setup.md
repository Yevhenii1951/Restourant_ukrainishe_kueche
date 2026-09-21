# Supabase admin setup

The repository is prepared for Supabase staff login. No credentials are stored in Git.

## Environment variables

Set these values in `.env.local` and in the Vercel project:

```sh
URL=https://your-deployment.example
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never expose it as a public
variable.

## Supabase Auth URLs

In Supabase Auth settings, configure the deployed site URL and allow these
redirect URLs:

```text
https://your-deployment.example/auth/callback
http://localhost:3000/auth/callback
```

The callback exchanges Supabase `code` values for HttpOnly session cookies and
then redirects to the localized admin path.

## Staff flow

1. Apply migrations and seeds to the target database.
2. Create the first admin with `npm run db:bootstrap-admin` or invite staff from
   an existing admin session.
3. Open `/de/admin/login`.
4. Sign in with email/password, send a magic link, or open an invite/reset email.
5. Invite/reset links land on `/auth/callback`; password setup continues at
   `/de/admin/password` when the email asks for a new password.
6. After a valid staff session exists, `/de/admin` opens the protected admin UI.

## Local-first boundary

Public restaurant flows still work without Supabase. Staff login and mutable
admin operations require the Supabase variables above.
