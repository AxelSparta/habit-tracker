# Inicio de sesión con Clerk y datos en Supabase

**Fecha:** 2026-09-30
**Rama:** main

## Resumen
La app ahora exige iniciar sesión con Clerk y guarda los hábitos y los completados en Supabase, en lugar de `localStorage`. La seguridad la dan las políticas RLS: Supabase valida el token de Clerk y cada usuario sólo ve sus propias filas. Si quedaron datos de la versión anterior en el navegador, se ofrece importarlos.

## Cambios

### Dependencias
- `@clerk/nextjs` 7.9, `@clerk/localizations` (UI de Clerk en español, variante `esUY` con voseo) y `@supabase/supabase-js` 2.117.

### `src/proxy.ts` (nuevo)
- `clerkMiddleware` con `auth.protect()` en todas las rutas salvo `/sign-in` y `/sign-up`.
- **Por qué:** en Next 16 el middleware se llama `proxy.ts`. Proteger desde ahí redirige al login antes de renderizar la página.

### `src/app/layout.tsx`, `src/app/(app)/layout.tsx`, `src/app/sign-in`, `src/app/sign-up`
- `<ClerkProvider>` va dentro de `<body>` (como indica la doc actual de Clerk).
- Las páginas se movieron al route group `(app)`. Su layout tiene la nav, el `HabitStoreProvider`, el banner de error y el de importación.
- Se agregaron las páginas `<SignIn />` y `<SignUp />` con catch-all (`[[...sign-in]]`), que Clerk usa para sus pasos internos.
- **Por qué el route group:** las pantallas de login no deben cargar el provider de datos, porque intentaría pedir datos sin sesión. Los paréntesis de `(app)` no aparecen en la URL.

### `supabase/migrations/0001_init.sql` (nuevo)
- Tablas `habits` y `completions`. `user_id text default auth.jwt()->>'sub'`, `on delete cascade` y clave primaria `(habit_id, day)`.
- Hay una política RLS `for all` por tabla. En `completions` también se verifica que el hábito sea tuyo.
- **Por qué `text` y no `uuid`:** los ids de Clerk son del tipo `user_2abc…`, no UUID.

### `src/lib/supabase.ts` (nuevo)
- `useSupabase()` crea un cliente con `accessToken: () => getToken()` de Clerk. Si faltan las variables de entorno, muestra un error claro.

### `src/lib/store.tsx` (reemplaza `store.ts`)
- `HabitStoreProvider` + `useHabits()` → `{ data, error, actions, dismissError }`.
- Carga todo al iniciar sesión. Pagina `completions` de a 1000 filas porque PostgREST corta ahí.
- Las acciones son **optimistas**: actualizan la UI al instante y después escriben en Supabase. Si falla, muestran el error y recargan desde el servidor.
- `importJSON` hace upsert, así que suma al contenido existente sin borrar nada.

### Componentes
- `today-view.tsx`, `habits-manager.tsx`, `stats-view.tsx`: usan `useHabits()`.
- `toggleCompletion` ahora recibe `wasDone` desde la UI. El export arma el JSON con `data`.
- `nav.tsx`: `<UserButton />` para el perfil y el cierre de sesión.
- `error-banner.tsx` (nuevo): avisa cuando una escritura falla.
- `local-data-import.tsx` (nuevo): si existe `habit-tracker:v1` en `localStorage`, ofrece importarlo a la cuenta y después lo borra.

### Config y docs
- `.env.example` (nuevo, se versiona gracias a `!.env.example` en `.gitignore`), y `.clerk/` ignorado.
- `README.md`: pasos de configuración de Clerk, Supabase y la integración.

## Conceptos clave
- **Third-party auth (Clerk → Supabase):** Supabase no maneja usuarios acá. Confía en los JWT que firma Clerk. Al activar la integración en Clerk, el token incluye `role: authenticated`, y así aplican las políticas `to authenticated`. `auth.jwt()->>'sub'` es el id del usuario de Clerk.
- **RLS como seguridad real:** la *publishable key* de Supabase es pública y viaja al navegador. Lo que impide leer datos ajenos son las políticas RLS, no la key. Por eso nunca hay que desactivar RLS en estas tablas.
- **Datos etiquetados por usuario:** el estado guarda `{ userId, data }`. Si cambia la sesión, `data` pasa a `null` sin necesidad de un `setState` en un effect, que es lo que pedía la regla `react-hooks/set-state-in-effect`. La carga usa un flag `cancelled` para descartar respuestas de un usuario anterior.

## Verificación
- `npm run lint` → sin problemas.
- `npm run typecheck` → sin errores.
- `npm test` → 11 tests pasan (la lógica de rachas no cambió).
- `npm run build` (con variables de Supabase de mentira) → compila. `/sign-in` y `/sign-up` son dinámicas, y aparece el Proxy.
- **No verificado:** el login real y las lecturas/escrituras en Supabase. No hay claves de Clerk ni proyecto de Supabase configurados, así que la app no se probó en ejecución contra los servicios.

## Pendientes / riesgos
- Hay que crear las cuentas, activar la integración, correr el SQL y completar `.env.local` (ver README).
- Aparecieron `pnpm-lock.yaml` y `pnpm-workspace.yaml` (creados a las 21:59, no por esta tarea). Conviven con `package-lock.json`, que se actualizó con npm. Conviene elegir un solo gestor.
- El `git mv` de `src/app/page.tsx` dejó ese renombre en el staging area.
- El import desde `localStorage` conserva los ids originales. Si se importa el mismo respaldo dos veces, hace upsert y no duplica.
