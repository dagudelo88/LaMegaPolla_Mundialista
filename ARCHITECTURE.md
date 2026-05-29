# La Mega Polla Mundialista — Architecture Overview

**Version**: 1.0  
**Date**: 29 May 2026

---

## Guiding Philosophy

**"Config-driven and data-driven by default. Hardcoding is a last resort."**

The system must be easy for non-technical admins (or future tournament organizers) to adjust without requiring code deployments. This applies to scoring, deadlines, navigation, copy, and feature availability.

---

## High-Level System Diagram

```mermaid
flowchart TB
    subgraph Client["Browser / Mobile (Next.js)"]
        A[Public Pages<br/>Landing + Rules]
        B[Auth Flow<br/>Google OAuth]
        C[Participant App<br/>Predictions / Schedule / Leaderboard]
        D[Admin UI<br/>Hidden from normal users]
    end

    subgraph NextJS["Next.js 15 App Router (Vercel)"]
        E[Server Components + Server Actions]
        F[Middleware<br/>Auth + Role Guards]
        G[lib/supabase<br/>server / client / admin]
    end

    subgraph Supabase["Supabase"]
        H[(PostgreSQL + RLS)]
        I[Auth (Google)]
        J[Edge Functions<br/>(optional later)]
    end

    A -->|public| E
    B --> I
    C -->|authenticated| E
    D -->|admin only| F
    F --> E
    E -->|anon key| H
    E -->|service role (server only)| H
    G --> H
    I --> H
```

---

## Key Architectural Layers

### 1. Presentation Layer (Next.js)
- App Router with route groups: `(public)`, `(app)`, `(admin)`
- All UI text in Spanish, sourced from config or a centralized module (no hard-coded Spanish strings in components after Phase 0).
- Responsive top navigation is a first-class shared component.

### 2. Application Layer (Server Actions + Server Components)
- All business logic that touches data lives here.
- Scoring calculation is a pure function that can be unit tested independently.
- Prediction submission and locking logic lives in Server Actions.

### 3. Data Access Layer
- **Primary**: Row Level Security in Supabase.
- **Secondary**: Server-side role checks before calling service role operations.
- Never rely on "the frontend just won't show the button".

### 4. Configuration Layer (Critical)
We will have multiple levels of configuration:

| Level | Examples | Storage | Change without deploy? |
|-------|----------|---------|------------------------|
| Build-time | Supabase URLs, Vercel env | `.env` + Vercel | No |
| Runtime (DB) | Scoring values, deadline offsets, navigation items | `config` table or dedicated tables | Yes |
| Feature flags | Enable/disable bracket simulator, jokers, streaks | DB or simple JSON config | Yes |

**Rule**: If a value is related to the game rules or user experience and might reasonably change during the tournament, it belongs in the database or a config table — not in a component or lib file.

---

## Authentication & Authorization Flow

1. User clicks "Iniciar sesión con Google".
2. Supabase OAuth redirect.
3. On callback: profile is created (or linked) with default role `participant`.
4. Middleware checks session + role on every request.
5. For `/admin/*` routes: middleware + layout both verify `role === 'admin'`. Non-admins get 404.
6. Any privileged mutation (result entry, prediction override, code generation) is wrapped in a Server Action that re-validates the admin role before using the service role client.

---

## Prediction Lifecycle (Data Flow) — Including Paid Changes

**Initial Phase (before tournament starts)**
- User must submit a **complete tournament fixture** (all predictions + bracket simulation).
- This is a one-time gate. No live participation until the full submission is done.

**Live Phase (after matches begin)**
```
User views upcoming matches
       ↓
User decides to spend points to change 1 prediction today
       ↓
System checks:
  - User has enough points
  - Has not already used their 1 daily change
       ↓
Server Action (atomic):
  - Deduct points from user
  - Record row in prediction_changes (with cost + date)
  - Update the prediction (locked remains true, but content changes)
  - Create audit trail
       ↓
Later: Admin enters real result
       ↓
Server Action (admin only):
  - Update match scores
  - Run scoring function
  - Credit points to profiles.total_points
  - (Points are both score and currency)
```

This turns points into a dual-purpose resource (scoreboard + spendable currency for corrections). The `prediction_changes` table is the enforcement mechanism for the "1 per day" rule.

---

## Scoring as a Pure Function + Points as Currency

```ts
// lib/scoring/calculateMatchPoints.ts
export function calculateMatchPoints(...) { ... }

// When a paid change happens, we also call a function that:
// 1. Calculates current points for the user
// 2. Checks if they have enough to spend
// 3. Deducts the cost atomically with the prediction update
```

Points are now a **dual-purpose resource** (scoring + currency for daily corrections). The pure scoring function remains the heart of the system.

---

## Admin Visibility & Safety

- The entire admin area lives under `/admin`.
- No admin links or components are rendered for non-admin users (even as comments or hidden divs).
- Admin Server Actions always start with an explicit `requireAdmin(user)` check that throws if the caller is not an admin.

---

## Future Extensibility Points

- Bracket simulator (Phase 4) will use the `matches` table with `home_source` / `away_source` + a resolution job after groups finish.
- Config-driven scoring will allow easy creation of special events (e.g. "Double points weekend") without code changes.
- The same foundation supports multiple future "pollas" if the user later decides to allow sub-groups.

---

## Technology Decisions (Summary)

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind + shadcn/ui
- **Database + Auth + Realtime potential**: Supabase
- **Hosting**: Vercel
- **Language**: Spanish-first (config-driven strings)
- **Deployment**: GitHub → Vercel previews + production

This architecture prioritizes **safety, configurability, and maintainability** over premature optimization.

---

**This document will evolve.** Any significant architectural decision must be recorded here with a date and rationale.