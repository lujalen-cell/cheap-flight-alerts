# Cheap Flight Alerts

提供一個搶廉價機票的網站，主要功能是當有便宜機票的時候，可以通知客人。

A static Vite + React SPA, using Supabase for auth and data, deployed on
Vercel.

## Development

You need Node.js (or Bun) installed.

```sh
git clone <this-repository-url>
cd cheap-flight-alerts
npm i   # or: bun install
npm run dev
```

Copy `.env` (or create one) with:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

## Build

```sh
npm run build
```

Outputs a static site to `dist/`. `vercel.json` adds the SPA fallback
rewrite so client-side routes (e.g. `/app`, `/alerts`) resolve correctly
when deployed.

## Google sign-in

Google OAuth goes through Supabase's own provider, not a custom broker —
enable it under **Authentication → Providers → Google** in the Supabase
dashboard, with a Google OAuth client whose authorized redirect URI is
`https://<project-ref>.supabase.co/auth/v1/callback`.
