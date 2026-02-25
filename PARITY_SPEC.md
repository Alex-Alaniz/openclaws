# PARITY SPEC: TrustClaw vs OpenClaws

## 1. Dashboard / Toolkits Page

| Element | TrustClaw Target (1440px) | OpenClaws Current | Delta | CSS Token / Spec |
|---------|---------------------------|-------------------|-------|------------------|
| Navbar Height | 64px | 68px | +4px | `h-16` |
| Toolkit Card W/H | 240px x 240px | 240px x 240px | 0px | `aspect-square`, `min-h-[240px]` |
| Grid Gap | 24px | 24px | 0px | `gap-6` |
| Card Radius | 24px | 24px | 0px | `rounded-[24px]` |
| Border Alpha | 0.08 | 0.08 | 0px | `border-white/[0.08]` |
| Search Input H | 42px | 42px | 0px | `h-[42px]` |
| Tab Pill Height | 36px | 32px | -4px | `h-9` |
| Connect Chip H | 32px | 32px | 0px | `h-8` |

## 2. Login Page

| Element | TrustClaw Target | OpenClaws Current | Delta | CSS Token / Spec |
|---------|------------------|-------------------|-------|------------------|
| Card Max-Width | 440px | 440px | 0px | `max-w-[440px]` |
| Card Radius | 32px | 32px | 0px | `rounded-[32px]` |
| Button Height | 52px | 52px | 0px | `h-[52px]` |
| Input Height | 52px | 52px | 0px | `h-[52px]` |
| Card Padding | 48px (sm: 40px) | 40px (sm: 48px) | -8px | `p-12` |

## 3. Findings & Implementation Plan
- **Dashboard Layout:** Reduce navbar height from 68px to 64px.
- **Toolkits Page:** Adjust tab pill height to 36px (h-9).
- **Login Page:** Ensure padding is consistent at 48px.
- **Landing Page:** Restore testimonials section as previously implemented (OpenClaw.new style).
