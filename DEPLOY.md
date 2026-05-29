# Despliegue — Vercel + Supabase

## Supabase (proyecto existente)

1. Aplica migraciones desde el repo:
   ```bash
   supabase link --project-ref TU_PROJECT_REF
   supabase db push
   ```
2. **Authentication → Providers → Google**: habilitado.
3. **Authentication → URL Configuration** — Redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://la-mega-polla-mundialista.vercel.app/auth/callback`
   - `https://la-mega-polla-mundialista-*.vercel.app/auth/callback` (previews; o añade cada preview manualmente)
4. Primer admin (tras registrarte con Google):
   ```bash
   npm run make-admin -- tu-email@gmail.com
   ```

## Vercel

**Proyecto:** `la-mega-polla-mundialista`  
**Producción:** https://la-mega-polla-mundialista.vercel.app  
**Dashboard:** https://vercel.com/daniel-agudelos-projects/la-mega-polla-mundialista

1. Repo ya importado desde `dagudelo88/LaMegaPolla_Mundialista` (rama `main`).
2. Framework: **Next.js** (detectado automáticamente).
3. Variables de entorno (Production **y** Preview — sin esto verás `MIDDLEWARE_INVOCATION_FAILED`):

   | Variable | Entorno |
   |----------|---------|
   | `NEXT_PUBLIC_SUPABASE_URL` | All |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All |
   | `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview (no marcar "Expose to browser") |

4. Deploy. Copia la URL preview y añádela en Supabase Auth redirect URLs.
5. Prueba: landing → Google OAuth → `/join` → dashboard → `/admin` (solo admin, 404 para otros).

## Local

```bash
cp .env.example .env.local
# Edita .env.local con tus keys
npm install
npm run dev
```

## Verificación Phase 0

- [ ] `npm run build` sin errores
- [ ] `npm test` — tests de scoring REGLAS §4
- [ ] OAuth crea fila en `profiles`
- [ ] Admin genera código; usuario canjea en `/join`
- [ ] `/admin` → 404 para participantes
- [ ] `/reglas` muestra `REGLAS.md`
- [ ] Nav usable en móvil (375px)
