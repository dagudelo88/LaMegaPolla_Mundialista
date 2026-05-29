# La Mega Polla Mundialista — Implementation Plan

**Date**: 29 May 2026  
**Status**: Ready for approval before any application code is written  
**Current Workspace State**: Bare git repository. No application code exists.

The user explicitly requested: **"stop and make a plan first"** and added the following requirements:

- Design and document the **full DB schema** as a first artifact.
- Document the **architecture** and technical decisions in `.md` files, including **diagrams**.
- Create a strict **RULES.md** (or equivalent) that every future agent or contributor **must** follow.
- Everything must be **config-driven / data-driven** — **zero hardcoded values** in the application code (scoring, deadlines, navigation, copy, feature flags, etc. must come from config or the database).

This revised plan incorporates all of the above.

---

## EXECUTABLE IMPLEMENTATION PLAN — Phase 0: Scaffolding & Foundation

### Context
The user wants a private, Spanish-language fantasy World Cup 2026 prediction pool ("La Mega Polla Mundialista") for friends, to be ready before the tournament begins on 11 June 2026.

Core non-negotiable requirements gathered from the conversation:
- Fully in **Spanish** (UI, navigation, copy, rules).
- Supabase for authentication using **Supabase OAuth** (Google primary, others possible) + PostgreSQL database with proper Row Level Security. Never implement custom auth.
- Deployable to **Vercel**.
- Two roles: `participant` and `admin` (admin is a super-participant who can also manage the app).
- Invitation code system so the admin can control who joins.
- Predictions are **submitted then locked** for normal users (only admin can override in exceptional cases).
- Users can **see other participants' predictions** (social/fun aspect).
- Every user is publicly identified by a **nickname/username** (not their email). The user chooses or is assigned a username that appears on the leaderboard and next to their predictions.
- Top navigation + excellent **responsive design from day one** (mobile-first, works great on phones).
- GolPredictor-style additive scoring (5 + 2 + 2 + 1 per group match, doubled in knockout).
- Later phases will add full tournament simulation/bracket, real match results entry, leaderboard, etc.

No code exists yet. We must start with a clean, secure, production-grade foundation so the rest of the features can be added without security holes or massive rework.

### Recommended Approach (Chosen Path)
1. Scaffold a modern **Next.js 15** application (App Router) with TypeScript, Tailwind CSS, ESLint, and shadcn/ui directly in this folder.
2. Integrate Supabase using the official `@supabase/ssr` package for cookie-based sessions that work correctly with Server Components, Server Actions, and middleware.
3. Strictly follow the security model from the Supabase integration guidelines:
   - Browser/client only ever receives the anon key.
   - Service role key exists only in server-only files and is used exclusively inside admin-protected Server Actions.
4. Implement a simple but robust role system (`profiles.role`).
5. Build a beautiful, fully Spanish public landing page + protected areas with proper top navigation (desktop) and mobile menu.
6. Deliver a working invite code + redemption flow and a completely hidden admin section.

This gives us a safe, fast, and delightful foundation for all subsequent phases.

**Why Next.js + Vercel instead of Vite + FastAPI?**
- User explicitly wants Vercel + Supabase.
- Next.js has native, zero-config deployment on Vercel.
- Server Actions + middleware make secure admin operations and role checks trivial and type-safe.
- Excellent Supabase SSR support.

**Free Tier Reality Check (Important)**
- The project will run on Supabase Free and Vercel Hobby tiers.
- We must design for a small number of users (dozens, not thousands).
- Avoid heavy Realtime subscriptions in Phase 0/1.
- Keep RLS policies efficient (avoid expensive joins in policies).
- Do not overuse Edge Functions or long-running server work.
- Leaderboards and scoring can be computed on-demand or with simple caching.
- All architecture decisions in `ARCHITECTURE.md` must respect these constraints.

### Major Game Mechanic: Full Submission + Points as Currency + Daily Changes (New Requirement)

The user has defined a specific flow that changes the prediction model:

1. **Before the tournament starts** (global first deadline): Every participant **must submit a complete set of predictions** for the entire tournament (all group stage matches + their simulated bracket / advancement picks all the way to champion).

2. **After results start coming in**: Users earn points from the GolPredictor-style scoring on actual matches.

3. **"Pay to Change" mechanic**:
   - Users can spend points they have earned to modify predictions for upcoming matches.
   - Cost: **3 points** per change.
   - Limit: **Maximum 1 match change per day**.
   - This gives skilled/accurate early predictors more "currency" to correct future mistakes or take new risks.

**Implications for the plan (must be reflected in schema, rules, UI, and scoring engine)**:
- Points are no longer just a scoreboard — they are a **spendable resource**.
- We need a way to record "prediction change events" with point cost deduction.
- The daily "1 change" limit must be enforced (probably via a `prediction_changes` log table with daily aggregation).
- The initial "complete fixture submission" becomes a gate (users cannot participate in the live phase until they have submitted the full set).
- **New advancement rule**: A user's ability to predict and score in knockout rounds is limited to the teams they correctly predicted would advance in their initial bracket submission. If their predicted team is eliminated in reality, they lose future scoring opportunities with that team.
- **New per-matchday bonus**: Each player can pick one match per jornada as "el más goleador". Correct match = +3 pts. Correct match + exact total goals = +5 pts. This requires a small additional betting flow per jornada.
- **Advancement bonus**: +2 points per team the player correctly predicted would advance to the next round (evaluated after each real round concludes).
- **Tripling change cost in knockout**: Changing a prediction costs 3 pts in group stage, but **9 pts** from Round of 32 onward.
- This mechanic must be clearly explained in the Rules page with examples.
- Admin must still be able to override anything for bug fixes (without costing the user points).

This is now one of the core fun differentiators of "La Mega Polla". It rewards accuracy early and gives players agency later.

### Phase 0 Deliverables (Definition of Done)
A fully working, Spanish, responsive web application with:
- Public homepage (hero, value proposition, "Iniciar sesión con Google", link to rules).
- Google OAuth login (via Supabase OAuth) that creates a `profiles` row.
- Invite code generation (admin only) and redemption flow.
- **Navigation that works excellently on any device** (phones, tablets, desktops). Top navigation on larger screens + clean mobile menu/hamburger (or bottom nav). Tested at common breakpoints.
- Protected participant dashboard area.
- Completely invisible admin section for normal users (middleware + layout guards return 404).
- Core Supabase tables created (`profiles`, `invitation_codes`) with correct RLS policies.
- First admin bootstrapped securely.
- All visible text in natural Spanish.

### Critical Files to Create (Phase 0)

| File / Area | Purpose | Notes |
|-------------|---------|-------|
| `app/layout.tsx` | Root layout, Spanish metadata, providers, fonts | |
| `app/page.tsx` | Public landing / marketing homepage | Hero + CTA + link to `/reglas` |
| `app/(auth)/login/page.tsx` | OAuth login screen | |
| `app/join/page.tsx` | Invite code redemption | |
| `middleware.ts` | Session + role protection (especially `/admin/*`) | Critical for security |
| `app/admin/layout.tsx` | Admin-only layout guard | Must return 404 for non-admins |
| `app/admin/page.tsx` | Admin dashboard (invites, users, basic stats) | |
| `lib/supabase/server.ts` | Server-side Supabase client (cookies) | |
| `lib/supabase/client.ts` | Browser client (anon key only) | |
| `lib/supabase/admin.ts` | Service role client — **never import in client components** | |
| `lib/supabase/middleware.ts` | Helper used by root middleware | |
| `components/nav/` | Top navigation + mobile menu that works excellently on **any device** (phones, tablets, desktop) | Spanish labels. Must be a first-class, tested component from day one. |
| `app/reglas/page.tsx` | Página de reglas del juego (usa el contenido de `REGLAS.md`) | Documento oficial en español para los participantes |
| `.env.example` | Document all required variables | |
| `scripts/make-first-admin.ts` (or SQL) | One-time bootstrap for the first admin | |
| `supabase/migrations/` or SQL scripts | Initial schema (profiles + invitation_codes) | |

### Patterns & Reference Material to Follow

- Supabase client setup, RLS-first design, service role discipline, and security checklist:  
  `C:\Users\dagud\.cursor\skills\supabase-integration\SKILL.md`

- TypeScript strictness, Tailwind organization, component patterns, and environment handling (adapt from Vite guidance to Next.js):  
  `C:\Users\dagud\.cursor\skills\vite-typescript-frontend\SKILL.md`

- Detailed schema, RLS policies, invite flow logic, Spanish UI requirements, and later phases: see the "Full Background" sections below in this same document.

### Verification Checklist (Phase 0)

Run these checks locally before considering Phase 0 complete:

1. `npm run dev` starts without errors.
2. Public homepage loads in Spanish with working Google sign-in button.
3. Completing Google OAuth creates a `profiles` row with `role = 'participant'`.
4. An admin can generate an invitation code.
5. A new user can successfully redeem a valid code at `/join`.
6. Normal participants **cannot** access any route under `/admin` (404 or redirect).
7. Top navigation is present, works, and is responsive (test 375px, 768px, 1440px+).
8. Every piece of user-facing text is in Spanish.
9. RLS policies prevent a normal authenticated user from reading other users' profiles or invitation codes (test with Supabase dashboard or direct query).
10. The first admin was created securely (via script or controlled SQL, not by accident).

When all 10 items pass, we have a solid, secure foundation and can move to Phase 1 (seeding teams + matches from official FIFA data + building the predictions UI).

---

## Pre-Implementation Deliverables (Must Be Completed Before Writing Any App Code)

Per the latest user instruction, the following artifacts must be created and reviewed **first**:

### 1. Database Schema (`DATABASE_SCHEMA.md`)
Complete, normalized, production-ready Supabase schema with:
- All tables, columns, constraints, indexes, enums
- Full RLS policy definitions (written as code comments + SQL)
- Seed data strategy
- Migration plan (initial + phased)
- Diagram (Mermaid ERD or DBML)

### 2. Architecture & Technical Documentation (`ARCHITECTURE.md`)
- High-level system diagram (Mermaid)
- Auth & authorization flow diagram
- Data flow for predictions → locking → scoring
- Folder structure + module boundaries
- Config-driven design principles (how we avoid hardcoding)
- Technology choices and rationale
- Security model (defense in depth)

### 3. Strict Contributor Rules (`RULES.md`)
A living document that **every AI agent and human contributor must follow**. Created as a first artifact (see the actual file `RULES.md` in the project root for the current version).

The three documents (`DATABASE_SCHEMA.md`, `ARCHITECTURE.md`, and `RULES.md`) now exist in the project root and are considered the official pre-code deliverables for this planning phase.

---

## Immediate Next Steps (This Planning Session)

1. Produce `DATABASE_SCHEMA.md` (with Mermaid diagram) — high priority.
2. Produce `ARCHITECTURE.md` (with diagrams) emphasizing config-driven design.
3. Produce `RULES.md` with a strict, enforceable set of rules.
4. Update this `PLAN.md` with references to the new documents.
5. Only after the user has reviewed and approved the above artifacts do we proceed to scaffold the Next.js application.

This order ensures we have a solid, well-documented, config-first foundation before any TypeScript/React code is written.

---

## Full Background & Remaining Details (Living Reference)

(The detailed decisions, schema, full phased roadmap, risks, etc. that were developed in the conversation live below this line. They remain valid context for future phases.)

### Scoring System (Confirmed)
Additive GolPredictor model (only 90 min + stoppage time counts):

- Group Stage: 5 (result) + 2 (home goals) + 2 (away goals) + 1 (goal difference) = **max 10 pts**
- Knockout: double = **max 20 pts**

See earlier sections for examples and tiebreakers.

### Key Technical Decisions
- Next.js 15 App Router + TypeScript + Tailwind + shadcn/ui
- Supabase Auth (Google OAuth) + Postgres + RLS
- Deploy to Vercel
- Entire UI in Spanish
- Submit-then-lock prediction model (user requirement)
- Other users' predictions are visible (user requirement)
- Top nav + mobile-first responsive from day one (user requirement)

### High-Level Phased Roadmap (Summary)
- **Phase 0** (this plan): Scaffolding, auth, roles, invites, Spanish shell, top nav + responsive.
- **Phase 1**: Official FIFA teams + 72 group stage matches seeding + predictions UI with deadlines.
- **Phase 2**: Admin result entry + scoring engine + leaderboard.
- **Phase 3**: Polish, rules page, profile, mobile excellence.
- **Phase 4** (post-MVP): Knockout bracket modeling + full tournament simulator.
- **Phase 5**: Production deployment, monitoring, real-user testing.

### Official Data Sources (User-Provided)
- Teams: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/teams
- Fixtures: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures
- Standings: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/standings

---

**Artifacts Produced in This Planning Session**

- `PLAN.md` (this file) — the executable roadmap
- `RULES.md` — strict, enforceable rules for all future contributors (AI and human)
- `REGLAS.md` — **Versión FINAL del Reglamento oficial del juego en español** (para los participantes). Estructurado de forma clara y profesional, incluye sección de reporte de bugs/errores desde la aplicación y distribución de premios.
- `DATABASE_SCHEMA.md` — complete schema + Mermaid ERD
- `ARCHITECTURE.md` — system diagrams + config-driven philosophy

**PDF Generation (Requested)**
The user requested a PDF version of the final rules.
- The source of truth is `REGLAS.md`.
- Recommended way to generate the PDF (to be done in implementation phase or by the user now):
  - Using Pandoc: `pandoc REGLAS.md -o REGLAS.pdf --pdf-engine=weasyprint` or `wkhtmltopdf`
  - Using online Markdown-to-PDF converters (copy the content of `REGLAS.md`)
  - GitHub: View the rendered markdown and "Print → Save as PDF"
- Once the project is scaffolded, we can add an automated step or a script in `/scripts/generate-reglas-pdf.sh`.

These four `.md` files in the project root now form the official technical foundation. No application code has been written.

---

**Recommended Next Steps (After User Approval)**

1. User reviews `RULES.md`, `DATABASE_SCHEMA.md`, and `ARCHITECTURE.md`.
2. Any required adjustments are made to the documents.
3. We scaffold the Next.js 15 project.
4. We implement the initial Supabase schema and the Phase 0 foundation following the strict rules defined in `RULES.md`.

**Status**: Planning phase complete. Awaiting user review and approval of the produced documentation before any code is written.