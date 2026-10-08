# Habit Tracker

App para registrar hábitos, mantener rachas y ver estadísticas. Hecha con
Next.js 16 (App Router), React 19, TypeScript y Tailwind CSS 4.

## Funcionalidades

- **Frecuencias**: todos los días, días específicos de la semana (p. ej. L·X·V)
  o N veces por semana.
- **Rachas** por hábito (en días o en semanas según la frecuencia) y una
  **racha general**: días seguidos en que completaste todos los hábitos con días
  fijos. El día de hoy (o la semana actual) queda "pendiente" y no corta la racha.
- **Estadísticas**: racha actual y mejor racha, % de cumplimiento en los últimos
  30 días, heatmap de actividad y check-ins por semana.
- Marcar días pasados (flechas en la pantalla "Hoy"), archivar y borrar hábitos.
- Exportar / importar los datos en JSON.

- **Cuentas** con [Clerk](https://clerk.com) y datos guardados en
  [Supabase](https://supabase.com), protegidos por Row Level Security: cada
  usuario sólo puede leer y escribir sus propios hábitos.

## Configuración

1. **Clerk**: creá una aplicación en <https://dashboard.clerk.com> y copiá las
   API keys.
2. **Supabase**: creá un proyecto en <https://supabase.com/dashboard>.
3. **Conectar Clerk con Supabase**:
   - En Clerk: _Integrations → Supabase_ (o
     <https://dashboard.clerk.com/setup/supabase>) → **Activate Supabase
     integration** y copiá el _Clerk domain_. Esto agrega al token de sesión el
     claim `role: authenticated` que Supabase necesita.
   - En Supabase: _Authentication → Sign In / Providers → Third-Party Auth →
     Add provider → Clerk_ y pegá el dominio.
4. **Tablas**: en Supabase, _SQL Editor_, ejecutá en orden los archivos de
   [`supabase/migrations/`](supabase/migrations/) (`0001_init.sql`,
   `0002_habit_position.sql`, …) o `supabase db push` si usás la CLI de
   Supabase.
5. **Variables de entorno**: copiá `.env.example` a `.env.local` y completalo.
6. `pnpm install` y `pnpm dev`.

Si en el navegador quedaron datos de la versión anterior (sin cuenta), la app
ofrece importarlos a tu cuenta al iniciar sesión.

## Scripts

```bash
pnpm dev           # servidor de desarrollo en http://localhost:3000
pnpm build         # build de producción
pnpm start         # servir el build
pnpm test          # tests (Vitest)
pnpm lint          # ESLint
pnpm typecheck     # tsc --noEmit
pnpm format        # Prettier
pnpm format:check  # Prettier sin escribir (lo corre el CI)
```

## Estructura

```
src/
  proxy.ts             Clerk: exige sesión en todo salvo /sign-in y /sign-up
  app/
    (app)/             rutas con sesión: / (Hoy), /habitos, /estadisticas
    sign-in/, sign-up/ pantallas de Clerk
  components/          vistas y gráficos (client components)
  lib/
    types.ts           modelo de datos
    dates.ts           helpers de fechas (claves YYYY-MM-DD, semana lunes–domingo)
    habits.ts          lógica de rachas y estadísticas (con tests)
    supabase.ts        cliente de Supabase con el token de Clerk
    habit-actions.ts   lectura y escrituras optimistas en Supabase (con tests)
    store.tsx          HabitStoreProvider + hook useHabits
supabase/migrations/   esquema SQL y políticas RLS
```
