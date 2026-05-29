# La Mega Polla Mundialista 2026

Polla privada del Mundial 2026 — Next.js 15 + Supabase + Vercel.

## Documentación

| Archivo | Rol |
|---------|-----|
| [REGLAS.md](./REGLAS.md) | **Reglamento oficial** (no modificar sin aprobación) |
| [RULES.md](./RULES.md) | Reglas para desarrolladores |
| [PLAN.md](./PLAN.md) | Roadmap por fases |
| [DEPLOY.md](./DEPLOY.md) | Supabase + Vercel |

## Inicio rápido

```bash
cp .env.example .env.local
npm install
supabase db push   # requiere CLI vinculado
npm run dev
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor local |
| `npm run build` | Build producción |
| `npm test` | Tests scoring (REGLAS §4) |
| `npm run make-admin -- email@...` | Promover primer admin |
| `npx tsx scripts/seed-fifa-placeholder.ts` | Seed de prueba (1 partido) |

## Jerarquía de reglas de juego

**REGLAS.md** > ARCHITECTURE / DATABASE_SCHEMA > PLAN.md (puede estar desactualizado en puntuación).
