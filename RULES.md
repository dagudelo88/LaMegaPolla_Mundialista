# Contributor Rules — La Mega Polla Mundialista

**For AI agents and human developers.**  
**Date**: 29 May 2026

---

## Document hierarchy (non-negotiable)

| Priority | File | Purpose |
|----------|------|---------|
| **1** | `REGLAS.md` | **Only** source of truth for scoring and game mechanics. **Never edit** without explicit product owner approval. |
| **2** | `ARCHITECTURE.md`, `DATABASE_SCHEMA.md` | Technical design. Schema must serve `REGLAS.md`. |
| **3** | `PLAN.md` | Phased roadmap and Phase 0 checklist. **May be outdated** on scoring/rules — ignore conflicting game logic. |
| **4** | This file (`RULES.md`) | How to build safely and consistently. |

If `PLAN.md` disagrees with `REGLAS.md` on points, changes, or mechanics, **implement `REGLAS.md`**.

---

## Config-driven code

- Game numbers (3/9 point change costs, 10/5/20/10 scoring, pool split, etc.) live in **`app_config`** (seeded from `REGLAS.md`), not as literals in UI or business logic.
- UI copy in Spanish: centralize in `lib/i18n/es.ts` in Phase 0; prefer DB config when values may change during the tournament.
- Secrets only in env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only).

---

## Supabase security

- Browser: **anon key only** via `lib/supabase/client.ts`.
- Service role: **only** `lib/supabase/admin.ts` — never import in `"use client"` files or client bundles.
- RLS enabled on all public tables; default deny.
- Admin mutations (invite codes, overrides): Server Actions with `requireAdmin()` then service role client.
- `/admin/*`: middleware + layout return **404** for non-admins (not 403). No admin links in nav for participants.

---

## Auth

- **Supabase Auth** (email + contraseña). Registro solo con código de invitación del admin. No auth custom.
- Session via `@supabase/ssr` cookies + `middleware.ts`.

---

## Game UI

- `/reglas` must render **`REGLAS.md`** (read file at build/runtime on server). Do not duplicate rule text in components.

---

## Quality bar

- TypeScript strict.
- Match existing patterns in the repo before inventing new abstractions.
- Scoring changes require unit tests derived from `REGLAS.md` §4.
- Minimal scope per PR/commit.

---

## What not to do

- Edit `REGLAS.md` while implementing features.
- Use PLAN’s GolPredictor 5+2+2+1 scoring model.
- Expose `SUPABASE_SERVICE_ROLE_KEY` to the client.
- Skip RLS because “only friends use the app”.
