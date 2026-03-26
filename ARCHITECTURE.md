# OpenClaws — Current Architecture

## Overview

OpenClaws is a hosted personal-agent platform. A user signs in on `openclaws.biz`, starts a dedicated OpenClaw gateway, manages provider keys and channels from the dashboard, and reaches that agent through the hosted web app plus paired messaging surfaces.

This document describes the **current implementation**, not the original Railway-era plan.

## Stack

- **Framework:** Next.js 16 (App Router)
- **Hosting:** Vercel for the web app
- **Auth:** NextAuth.js (Google OAuth)
- **Database:** Supabase (PostgreSQL)
- **Billing:** Stripe
- **Gateway provisioning:** Fly Machines
- **Observability:** Sentry web + server SDKs, Sentry webhook -> Linear + Paperclip issue creation
- **Agent runtime:** Dedicated OpenClaw gateway per customer

## Main Product Surfaces

- `/` - marketing / landing page
- `/login` - Google sign-in
- `/dashboard` - primary app shell
- `/dashboard/settings` - model selection, provider keys, billing, personalization
- `/dashboard/toolkits` - Composio-connected integrations
- `/api/instance` - create, fetch, and destroy a customer gateway instance
- `/api/gateway/*` - gateway control-plane actions used by the dashboard
- `/api/webhooks/sentry` - receives Sentry issue webhooks and opens bugs in Linear and Paperclip

## Provisioning Flow

Gateway provisioning is handled in `src/lib/fly.ts` and invoked from `src/app/api/instance/route.ts`.

### What gets created

For each provisioned customer:

1. A Fly app named from `FLY_APP_PREFIX` + a unique slug
2. A persistent Fly volume mounted at `/data`
3. A dedicated Fly Machine running the OpenClaw gateway image
4. A custom subdomain at `https://{slug}.openclaws.biz`
5. A generated gateway token stored in the OpenClaws database

### Runtime image and startup behavior

The machine currently runs:

- Image: `ghcr.io/openclaw/openclaw:main`
- Command path: `node dist/index.js gateway --allow-unconfigured --port 3000 --bind lan`

Before boot, provisioning seeds `/data/openclaw.json` and writes an `IDENTITY.md` file so the hosted agent introduces itself as an OpenClaws agent rather than a raw upstream model persona.

### Gateway config seeded at provision time

Provisioning currently sets:

- `gateway.controlUi.allowedOrigins` for the hosted domains
- `gateway.controlUi.allowInsecureAuth = false`
- `skills.entries.composio.enabled = true`
- a minimal default `agents.list` entry for the customer agent

### Provider-key behavior

OpenClaws passes through user-supplied model keys when available:

- `ANTHROPIC_API_KEY`
- `ANTHROPIC_OAUTH_TOKEN`
- `OPENAI_API_KEY`

If the user has not supplied Anthropic credentials and the platform has one configured, OpenClaws mints a short-lived proxy token and points the gateway at the hosted Anthropic proxy.

### Composio behavior

If Composio is configured, provisioning also:

- passes `COMPOSIO_API_KEY`
- passes a per-user `COMPOSIO_ENTITY_ID`
- installs a lightweight `composio-exec` bridge into the customer gateway
- installs a small Composio skill into persistent storage

## Security / Network Posture

### Current behavior

The provisioned gateway is intentionally exposed through Fly on ports 80/443 and the OpenClaw process binds with `--bind lan` so Fly’s proxy can reach it.

Provisioning also starts a background loop that repeatedly runs:

`openclaw devices approve --latest`

This means device pairing is currently optimized for low-friction hosted onboarding rather than strict manual approval.

### Why this matters

This is a deliberate **managed-hosting exception** to the stricter internal OpenClaw posture of loopback-only listeners plus explicit device approval.

Operational upside:

- much simpler end-user onboarding
- fewer support tickets for first-time pairing
- works with Fly’s public routing model

Tradeoff / risk:

- weaker pairing friction than a manually approved device flow
- background approval can hide pairing-state problems instead of surfacing them clearly
- security expectations must be documented accurately so support and engineering do not assume loopback-only behavior

If OpenClaws later tightens posture, the likely path is:

- remove auto-approval loop
- keep hosted ingress but require explicit pairing approval
- make sleeping / waking / approval state visible in the dashboard

## Pairing Approval Path

The dashboard can call `POST /api/gateway/approve-pairing`.

Current behavior:

- looks up the customer’s Fly app / machine / gateway token
- verifies the Fly machine is actually running
- executes `openclaw devices approve --latest --json` inside the machine
- returns a specific response when there is no pending request
- returns a specific response when the machine is stopped / sleeping instead of a generic failure

### Operational caveat

This route still depends on Fly machine exec, so it is inherently more fragile than an in-process control-plane API. If Fly exec is degraded or the machine is asleep, approval can fail even though the underlying gateway config is fine.

## Observability and Support

### Sentry

OpenClaws initializes Sentry in both client and server contexts:

- `sentry.client.config.ts`
- `sentry.server.config.ts`

Current safeguards include:

- disabling default PII sending
- masking client-side inputs in session replay
- stripping provider API headers from server breadcrumbs
- scrubbing common API key patterns from client error messages

### Sentry -> Linear + Paperclip

`/api/webhooks/sentry` verifies the Sentry HMAC signature and creates bug tickets in:

- **Linear** for product/project tracking
- **Paperclip** for agent assignment / triage

Routing is based on the Sentry project slug. For `openclaws`, bugs are routed into the OpenClaws Linear and Paperclip projects and assigned to the OpenClaws lead agent when configured.

### Current support gap

OpenClaws is good at turning thrown errors into tickets, but thinner on customer-visible diagnostics for provisioning and pairing. Support still relies heavily on:

- Fly machine state
- Fly exec health
- Sentry traces/errors
- DB instance rows

The dashboard does not yet expose a rich, first-party support view for why onboarding or pairing failed.

## Known Gaps / Follow-Up Work

1. **Pairing approval should avoid shelling through Fly exec when possible.**
   A first-class control endpoint on the gateway would be more reliable than exec-ing CLI commands into the machine.

2. **Provisioning posture needs an explicit product decision.**
   The current hosted setup favors onboarding convenience over strict manual device authorization. That should remain documented unless/until product changes it.

3. **Support visibility is still thin.**
   The dashboard should eventually expose machine state, last provisioning error, and pairing status more directly.

4. **Keep this file honest.**
   If provisioning or network posture changes, update this document in the same PR.
