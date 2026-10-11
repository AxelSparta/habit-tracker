# Fase 1 — Editar el historial desde el heatmap

**Fecha:** 2026-10-10
**Rama:** main

## Resumen

Ahora se puede tocar cualquier día pasado (o el de hoy) del heatmap de
Estadísticas. Se abre un panel con los hábitos que aplicaban ese día, donde se
pueden marcar o desmarcar. Las rachas y los gráficos se recalculan al instante.

## Cambios

### `src/lib/habits.ts`

- Nueva función `appliesOn(habit, day)`. Devuelve si el hábito se podía marcar
  ese día: tenía que existir (`createdAt <= day`) y tocarle ese día. Los
  hábitos de "N veces por semana" aplican cualquier día.
- **Por qué:** "Hoy" ya tenía esta regla escrita a mano y el panel nuevo la
  necesitaba igual. Con una sola función, las dos pantallas no pueden mostrar
  hábitos distintos para el mismo día.

### `src/lib/habit-actions.ts`

- `toggleCompletion` ignora las fechas posteriores a hoy: no cambia el estado
  ni manda la request.
- **Por qué:** el heatmap ya desactiva los días futuros. La guardia en la
  acción hace que la regla se cumpla aunque mañana se llame desde otro lado.

### `src/components/charts.tsx`

- Las celdas del heatmap pasan de `<span>` a `<button>`. Hay dos props nuevas:
  `selected`, el día resaltado con un anillo, y `onSelect`.
- `aria-label` con la fecha larga (ej. "Martes, 6 de octubre: 2 completados")
  y `aria-pressed` para indicar cuál está elegido.
- Los días futuros quedan `disabled`. El contenedor suma `p-0.5` para que el
  anillo de selección no se recorte en los bordes.
- **Por qué `<button>`:** con un botón, Tab, Enter y Espacio funcionan solos y
  los lectores de pantalla lo anuncian como algo que se puede activar. Con un
  `span` habría que programar todo eso a mano.

### `src/components/day-editor.tsx` (nuevo)

- Panel con los hábitos activos que aplicaban ese día, el contador "X de Y
  completados" y un botón para cerrarlo. Cada hábito es un botón que llama a
  `actions.toggleCompletion`, que ya está testeado y hace rollback si el
  servidor falla.

### `src/components/stats-view.tsx`

- Estado `selectedDay`. Tocar un día lo abre y tocar el mismo día otra vez lo
  cierra. El panel aparece dentro de la tarjeta "Actividad", debajo del
  heatmap, junto con un texto de ayuda.

### `src/components/today-view.tsx`

- `dueToday` usa `appliesOn`. El comportamiento es el mismo.

### Tests

- `habits.test.ts`: `appliesOn` antes de la creación, con días fijos y en
  hábitos semanales.
- `habit-actions.test.ts`: una fecha futura no cambia el estado ni manda
  requests.

### `docs/roadmap.md`

- Fase 1 marcada como hecha.

## Conceptos clave

- **Por qué se recalcula todo al instante:** `toggleCompletion` es una
  escritura optimista. Primero actualiza `data` en el store y después escribe
  en Supabase. `StatsView` calcula las rachas, el heatmap y las barras en un
  `useMemo` que depende de `data`, así que el cambio local alcanza para que
  todo se vuelva a calcular, sin esperar al servidor. Si Supabase rechaza la
  escritura, el runner recarga los datos y el cambio se descarta.
- **Hábitos archivados:** el panel no los muestra, igual que el heatmap, que
  sólo cuenta hábitos activos. Así el panel coincide con el color de la celda.

## Verificación

- `pnpm format:check` → OK
- `pnpm typecheck` → OK
- `pnpm lint` → sin errores
- `pnpm test` → 35/35 pasan
- `pnpm build` → OK
- **No probado en el navegador:** falta verificar a mano con una sesión real
  en `/estadisticas`.

## Pendientes / riesgos

- El heatmap tiene 126 celdas y cada una es una parada de Tab. Ya pasaba antes
  con los `span` (`tabIndex=0`). Si molesta, se puede pasar a navegación con
  flechas (roving tabindex).
- Para corregir días de hábitos archivados hay que desarchivarlos primero.
