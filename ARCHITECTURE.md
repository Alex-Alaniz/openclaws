# OpenClaws.me - Architecture

## Overview
Hosted OpenClaw agent platform. Users sign up, get an AI agent on Telegram/Discord/WhatsApp, connect integrations via Composio OAuth.

## Stack
- **Framework:** Next.js 15 (App Router)
- **Hosting:** Vercel
- **Auth:** NextAuth.js (Google OAuth)
- **Database:** Supabase (PostgreSQL)
- **Billing:** Stripe Checkout + Customer Portal
- **Agent Provisioning:** Railway API (Docker containers)
- **Integrations:** Composio SDK
- **Styling:** Tailwind CSS

## Pages
- `/` - Landing page (already built, copy from openclaws-landing/)
- `/login` - Google OAuth sign-in
- `/dashboard` - Main chat interface (like TrustClaw)
- `/dashboard/toolkits` - Composio integrations (like TrustClaw toolkits)
- `/dashboard/settings` - User settings, billing, model selection
- `/api/auth/[...nextauth]` - NextAuth routes
- `/api/stripe/webhook` - Stripe webhook handler
- `/api/stripe/checkout` - Create checkout session
- `/api/agent/provision` - Provision OpenClaw instance on Railway

## User Flow
1. Land on openclaws.me
2. Click "Get Started" -> Google OAuth
3. Free tier: basic chat, limited messages
4. Click "Upgrade" -> Stripe $29/mo
5. Premium: better models, unlimited, toolkits access
6. Toolkits: connect Gmail, GitHub, Slack etc. via Composio OAuth

## Agent Provisioning
Each user gets a dedicated OpenClaw Docker container on Railway:
- Docker image: ghcr.io/openclaw/openclaw:latest
- Configured with user's chosen model + channel
- Composio integrations passed as env vars
- Health monitoring via Railway API

## Free vs Premium
| Feature | Free | Premium ($29/mo) |
|---------|------|-------------------|
| Messages | 50/day | Unlimited |
| Model | Sonnet 4.5 | Opus 4.5 + GPT-4o + Gemini |
| Integrations | 3 | Unlimited |
| Channels | 1 | All (Telegram, Discord, WhatsApp) |
| Mission Control | Basic | Full dashboard |
