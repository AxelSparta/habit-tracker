# Setup inicial del habit tracker

**Fecha:** 2026-09-30
**Rama:** main

## Resumen
Se creó una app Next.js 16 para registrar hábitos con frecuencias (diaria, días específicos o N veces por semana), rachas por hábito, una racha general y estadísticas (KPIs, heatmap, barras semanales, tabla por hábito). Los datos se guardan en `localStorage`. También se configuraron Vitest, Prettier y scripts de calidad.

## Cambios

### Scaffold (`create-next-app`)
- TypeScript, Tailwind 4, ESLint, App Router, carpeta `src/`, alias `@/*`, Turbopack.
- **Por qué:** es el stack estándar y actual de Next.js. No hace falta configurar nada a mano.

### `src/lib/types.ts`
- Modelo: `Habit` (con `frequency` como unión discriminada), `HabitData` (hábitos + completados por fecha).
- **Por qué:** con una unión discriminada (`type: "daily" | "weekdays" | "timesPerWeek"`), TypeScript te obliga a manejar cada tipo de frecuencia en cada `switch`.

### `src/lib/dates.ts`
- Las fechas se guardan como claves `YYYY-MM-DD` en hora local, y la semana va de lunes (0) a domingo (6).
- **Por qué:** con `Date`/ISO en UTC, un check hecho a las 22 h en Argentina caería al día siguiente. Además, los strings `YYYY-MM-DD` se pueden comparar con `<`/`>` directamente.

### `src/lib/habits.ts`
- `getPeriods` (línea 53) convierte cada hábito en una lista de "períodos" (días programados, o semanas para los hábitos semanales). Cada período queda marcado `done`, `missed` o `pending`.
- `currentStreak`, `bestStreak`, `countInWindow`/`completionRate` y `getGlobalDays` (línea 149) operan sobre esa lista.
- **Por qué:** así las tres frecuencias comparten la misma lógica de racha. Lo único que cambia es cómo se arman los períodos.

### `src/lib/store.ts`
- Store en `localStorage` con caché en memoria, `actions` (crear/editar/archivar/borrar/marcar/exportar/importar) y el hook `useHabitData` (línea 63), que usa `useSyncExternalStore`.
- **Por qué:** no hace falta backend para uso personal, y un JSON exportado sirve de respaldo. El store está aislado, así que pasar a una base de datos más adelante solo toca este archivo.

### `src/components/*` y `src/app/*`
- `/` → `today-view.tsx`: los hábitos del día, flechas para editar días pasados y los KPIs de racha.
- `/habitos` → `habits-manager.tsx` + `habit-form.tsx`: CRUD, archivar y respaldo JSON.
- `/estadisticas` → `stats-view.tsx` + `charts.tsx`: KPIs, heatmap, barras semanales y tabla por hábito.
- `nav.tsx`, `ui.tsx`: navegación y piezas compartidas.
- `globals.css`: tokens de color con modo oscuro. El heatmap usa una rampa secuencial de un solo tono (azul).
- `layout.tsx`: `lang="es"`, metadata y nav.

### Tooling
- `vitest.config.mts`, `src/lib/habits.test.ts` (11 tests de la lógica de rachas).
- `.prettierrc.json`, `.prettierignore`.
- `package.json`: scripts `test`, `test:watch`, `typecheck`, `format`. Se subió `@types/node` a `^24`.
- **Por qué `@types/node@24`:** Vitest 5 exige `@types/node >=22` como peer, y además el Node instalado es v24.
- `README.md` reescrito en español.

## Conceptos clave
- **Estado "pending":** si hoy todavía no marcaste un hábito, la racha no se corta, porque el día no terminó. Solo se corta con un período pasado `missed`. Para los hábitos semanales pasa lo mismo con la semana en curso.
- **Racha general:** cuenta los días seguidos en que completaste *todos* los hábitos con días fijos que tocaban ese día. Los días sin hábitos programados se saltean, y los de "N veces por semana" no entran porque no tienen día fijo.
- **`useSyncExternalStore` + `getServerSnapshot = () => null`:** en el servidor no hay `localStorage`. Por eso el servidor renderiza un skeleton y el cliente muestra los datos al hidratar, sin errores de hydration mismatch. La caché en memoria hace que `read()` devuelva siempre el mismo objeto mientras nada cambie, que es lo que React necesita para no re-renderizar en bucle.
- **SVG con ancho real (`useWidth`):** si se usa `viewBox` fijo con `width: 100%`, el texto del eje se encoge en el celular. Con un `ResizeObserver` se dibuja al ancho real y el texto mantiene su tamaño.

## Verificación
- `npm test` → 11 tests pasan.
- `npm run typecheck` → sin errores.
- `npm run lint` → sin problemas.
- `npm run build` → compila. Rutas estáticas: `/`, `/habitos`, `/estadisticas`.
- Prueba manual con Playwright (390px, modo claro y oscuro) y datos de ejemplo: se revisaron capturas de las 3 pantallas. Se corrigieron un overflow horizontal y la capitalización de la fecha.
- Flujo E2E: crear hábitos, marcar un check, recargar (persiste) y navegar a días pasados → OK.

## Pendientes / riesgos
- Los datos viven solo en ese navegador. Si se borran los datos del sitio, se pierden, salvo que hayas exportado el JSON.
- Al archivar un hábito, deja de contar en la racha general histórica, así que la racha general pasada podría cambiar.
- No se pueden marcar días anteriores a la fecha de creación del hábito.
- No se hizo commit: los cambios quedan sin commitear sobre el commit inicial de `create-next-app`.
