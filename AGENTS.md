# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

OpenClaws is a single Next.js 16 (App Router) application — not a monorepo. It is an AI agent platform where users deploy personal AI assistants accessible via Telegram/Discord/WhatsApp with Composio-powered integrations.

### Running the application

- **Dev server:** `npm run dev` (port 3000)
- **Lint:** `npm run lint`
- **Build:** `npm run build --webpack`
- Standard scripts are in `package.json`.

### Environment variables

A `.env.local` file is required at the project root. The minimum required variables for the dev server to start:

- `NEXTAUTH_SECRET` — any string (e.g. `dev-secret-for-local-development-only`)
- `NEXTAUTH_URL` — `http://localhost:3000`

OAuth providers (Google, Twitter/X) are conditionally loaded — the app starts fine without them but login will not work. Composio and Stripe API keys are similarly optional for basic dev.

### Important caveats

- The cloud environment may pre-set `NODE_ENV` to a value that causes `npm install` to skip devDependencies. Always use `npm install --include=dev` to ensure ESLint, TypeScript, Tailwind, and other dev tools are installed.
- The `middleware.ts` file triggers a Next.js 16 deprecation warning about "middleware" → "proxy". This is cosmetic and does not affect functionality.
- No database, Docker, or external services are required to start the dev server. All external integrations (Supabase, Stripe, Composio, Railway) fail gracefully when their keys are absent.
