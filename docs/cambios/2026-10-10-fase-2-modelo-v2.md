# Fase 2 — Modelo de datos v2 (valor + nota)

**Fecha:** 2026-10-10
**Rama:** main

## Resumen

Prepara los datos para las fases 3 (hábitos medibles) y 4 (notas). Cada hábito
puede tener una meta y una unidad, y cada check-in puede guardar un valor y
una nota. Por ahora la app se ve y se comporta igual. Lo que cambia es cómo
guarda y lee los datos.

## Cambios

### `supabase/migrations/0003_values_notes.sql` (nuevo)

- Columnas nuevas en `habits`:
  - `target numeric`: tiene que ser mayor que 0.
  - `unit text`: hasta 20 caracteres.
- Columnas nuevas en `completions`:
  - `value numeric`: tiene que ser 0 o más.
  - `note text`: hasta 500 caracteres.
- **Por qué todas aceptan `null`:** las filas que ya existen quedan con `null`,
  y eso quiere decir "hábito sí/no, marcado". Por eso no hace falta reescribir
  ningún dato.

### `src/lib/types.ts`

- `Habit` suma `target?` y `unit?`.
- Tipos nuevos:
  - `Entry = { value?; note? }`: lo que se registra de un hábito en un día.
  - `Completions = Record<habitId, Record<fecha, Entry>>`: todos los registros,
    por hábito y por fecha.
- `HabitData` pasa a `version: 2`.

### `src/lib/habits.ts`

- `isDone(habit, entry)` (línea 32) es la única regla para decidir si un día
  está completado:
  - Sin registro, no está completado.
  - En un hábito medible, se completa si el valor llega a la meta
    (`value >= target`).
  - En un hábito sí/no, alcanza con que haya registro, salvo que el valor sea 0.
- `doneDays(habit, entries)` (línea 39) devuelve el `Set` de fechas
  completadas.
- `getGlobalDays` recibe los registros nuevos y usa `doneDays`.
- **Por qué:** las rachas siguen igual. `getPeriods`, `currentStreak` y
  `bestStreak` no cambiaron y siguen recibiendo un `Set` de fechas. Solo
  cambió cómo se arma ese `Set`, y la regla quedó en un único lugar.
- **El caso del valor 0:** la fase 4 propone guardar notas en días sin
  completar como un registro con `value = 0`. La regla ya contempla ese caso,
  así que la fase 4 no va a tener que cambiarla.

### `src/lib/habit-actions.ts`

- `fetchAll` trae `target`, `unit`, `value` y `note`. Las columnas en `null`
  no se agregan al objeto (`toEntry`, línea 51), así que un hábito sí/no
  queda como `{}`.
- `parseBackup` (línea 110) acepta respaldos v1, donde cada hábito tiene una
  lista de fechas, y los convierte a v2: cada fecha pasa a ser `{}`. Los
  respaldos v2 se cargan tal cual. También rechaza `completions: null`.
- `toggleCompletion` (línea 238) agrega o borra `completions[id][day]` en vez
  de manipular un array, así que ya no hace falta ordenar.
- `importJSON` (línea 260) sube `value` y `note` junto con cada fila.

### Componentes (`stats-view.tsx`, `today-view.tsx`, `day-editor.tsx`)

- Antes preguntaban `completions[id].includes(day)`. Ahora usan `isDone` o
  `doneDays`.
- `HabitRow` de "Hoy" recibe directamente un `Set` de fechas completadas.
- `StatsView` reusa ese `Set` de cada hábito para armar el heatmap.

### Tests

- `habits.test.ts`:
  - `isDone` en hábitos sí/no, con valor 0 y en medibles con la meta parcial.
  - Rachas de un hábito medible.
  - Racha general con un hábito medible que no llegó a la meta.
- `habit-actions.test.ts`:
  - Conversión de respaldos v1 a v2.
  - Respaldos v2 que conservan valor y nota.
  - `fetchAll` arma los registros sin campos `null`.
  - El import sube `value` y `note`.
  - Se adaptaron los tests de `toggleCompletion` y de paginación.

### `docs/roadmap.md`

- Fase 2 marcada como hecha.
- En la fase 4 quedó anotado que `isDone` ya contempla `value = 0`.

## Conceptos clave

- **Migración aditiva:** agregar columnas que aceptan `null` no rompe nada de
  lo que ya existe, ni los datos ni las queries viejas.
- **Separar la regla de la fuente:** las funciones de rachas reciben un
  `Set<string>` y no saben de dónde viene. Por eso pasar de "lista de fechas"
  a "registros con valor" solo cambió la función que arma el `Set`.
  `isDone`/`doneDays` es el único lugar que interpreta un registro.

## Verificación

- `pnpm format:check` → OK
- `pnpm typecheck` → OK
- `pnpm lint` → sin errores
- `pnpm test` → 44/44 pasan
- `pnpm build` → OK
- **No probado contra Supabase real ni en el navegador.**

## Pendientes / riesgos

- **Hay que correr `0003_values_notes.sql` en los dos proyectos de Supabase
  (dev y producción) antes de usar la app o desplegar.** Sin las columnas
  nuevas, `fetchAll` falla y la app no carga. Se corre desde el SQL Editor de
  Supabase.
- `toggleCompletion` borra la fila al desmarcar. Hoy no hay notas, así que no
  se pierde nada. En la fase 4, si el día tiene nota, hay que pasarlo a
  `value = 0` en vez de borrarlo.
- `updateHabit` todavía no sabe borrar una meta (pasarla a `null`). Eso queda
  para la fase 3, cuando el formulario permita editarla.
