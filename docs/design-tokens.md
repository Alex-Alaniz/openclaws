# OpenClaws Shared Design Tokens

Both the **SaaS Dashboard** (Next.js / Tailwind) and the **openclaw Control UI** (Lit / Vite) share a unified visual language. This document describes the canonical design tokens and how they map across both codebases.

## Token File

**SaaS Dashboard:** `src/styles/design-tokens.css` (CSS custom properties, `--oc-*` prefix)  
**Control UI:** `ui/src/styles/base.css` (CSS custom properties, no prefix)

The SaaS dashboard tokens use the `--oc-` prefix to avoid collisions with Tailwind's built-in utilities and to clearly namespace shared values.

## Color Palette (Dark Mode)

| Token | SaaS (`--oc-*`) | Control UI | Value |
|-------|-----------------|------------|-------|
| Background | `--oc-bg` | `--bg` | `#0e1015` |
| Background accent | `--oc-bg-accent` | `--bg-accent` | `#13151b` |
| Elevated | `--oc-bg-elevated` | `--bg-elevated` | `#191c24` |
| Hover | `--oc-bg-hover` | `--bg-hover` | `#1f2330` |
| Card | `--oc-card` | `--card` | `#161920` |
| Text | `--oc-text` | `--text` | `#d4d4d8` |
| Text strong | `--oc-text-strong` | `--text-strong` | `#f4f4f5` |
| Muted | `--oc-muted` | `--muted` | `#636370` |
| Muted strong | `--oc-muted-strong` | `--muted-strong` | `#4e4e5a` |
| Border | `--oc-border` | `--border` | `#1e2028` |
| Border strong | `--oc-border-strong` | `--border-strong` | `#2e3040` |
| Accent (brand red) | `--oc-accent` | `--accent` | `#DC2626` |
| Accent hover | `--oc-accent-hover` | `--accent-hover` | `#ef4444` |
| Accent subtle | `--oc-accent-subtle` | `--accent-subtle` | `rgba(220, 38, 38, 0.10)` |
| OK (green) | `--oc-ok` | `--ok` | `#22c55e` |
| Warning | `--oc-warn` | `--warn` | `#f59e0b` |
| Danger | `--oc-danger` | `--danger` | `#ef4444` |

## Typography

| Token | Value |
|-------|-------|
| Body font | `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` |
| Mono font | `JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace` |

Both dashboards use **Inter** as the primary typeface, ensuring visual consistency.

## Border Radius

| Token | Value |
|-------|-------|
| `--oc-radius-sm` | `6px` |
| `--oc-radius-md` | `10px` |
| `--oc-radius-lg` | `14px` |
| `--oc-radius-xl` | `20px` |

## Usage in Tailwind

In the SaaS dashboard, tokens are consumed via Tailwind's arbitrary value syntax:

```tsx
// Background
<div className="bg-[var(--oc-bg)]" />

// Text
<span className="text-[var(--oc-text-strong)]" />

// Border
<div className="border border-[var(--oc-border)]" />

// Hover
<button className="hover:bg-[var(--oc-bg-hover)]" />
```

## Semantic Colors (Not Tokenized)

These brand colors are used for third-party service integrations and should **not** be tokenized:

- Telegram: `#26A5E4`
- Discord: `#5865F2`
- WhatsApp: `#25D366`
- Emerald (status): Tailwind `emerald-*` utilities

## Adding New Tokens

1. Add the CSS variable to `src/styles/design-tokens.css` with `--oc-` prefix
2. Ensure the value matches the equivalent in `openclaw/ui/src/styles/base.css`
3. Use the token via `var(--oc-*)` in Tailwind classes
4. Update this document
