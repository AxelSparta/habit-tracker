# Fase 3 — Hábitos medibles

**Fecha:** 2026-10-10
**Rama:** main

## Resumen

Un hábito puede ser "Medible", con una meta diaria y una unidad (ej. "8
vasos"). En "Hoy" y en el panel del heatmap se carga con un contador − / + o
escribiendo la cantidad. El día cuenta para la racha solo si llega a la meta.
Estadísticas muestra el promedio diario de cada hábito medible.

## Cambios

### `src/lib/habit-actions.ts`

- `HabitInput` suma `target?` y `unit?`.
- Nueva acción `setValue(id, day, value)` (línea 266):
  - Guarda la cantidad con un **upsert**: inserta la fila o la actualiza si ya
    existe.
  - Si la cantidad llega a 0, borra el registro, salvo que tenga nota. En ese
    caso queda con `value = 0`, que es la regla que ya prepara la fase 4.
  - Ignora fechas futuras y cantidades negativas.
- `updateHabit` (línea 198) manda `null` cuando el cambio trae
  `target`/`unit` en `undefined`.
  - **Por qué:** `JSON.stringify` descarta las claves con `undefined`. Sin
    este arreglo, al pasar un hábito de "Medible" a "Sí / no" la meta quedaba
    guardada en la base.

### `src/lib/habits.ts`

- `formatAmount`: muestra un número con hasta un decimal, en formato local
  ("2,5").
- `describeTarget` (línea 218): arma el texto de la meta, ej. "8 vasos".
- `averageValue` (línea 228): promedio diario en los últimos N días.
  - Cuenta los días en que el hábito aplicaba; un día sin registro suma 0.
  - El día de hoy solo cuenta si ya tiene registro, para no bajar el promedio
    con un día que todavía no terminó.

### `src/components/value-stepper.tsx` (nuevo)

- `ValueStepper`: botones − / + y un campo editable. Lo que se escribe se
  guarda al salir del campo o con Enter; Escape cancela. Acepta coma decimal.
- `TargetProgress`: barra de progreso con el texto "3 / 8 vasos".
- Se usan en "Hoy" y en el panel del heatmap, así que el comportamiento es el
  mismo en los dos lugares.

### `src/components/habit-form.tsx`

- Nueva sección "Registro" con dos opciones: "Sí / no" o "Medible". Si es
  medible, aparecen los campos de meta por día (tiene que ser mayor que 0) y
  de unidad (opcional, hasta 20 caracteres).
- El formulario siempre manda `target` y `unit`, aunque sea `undefined`. Así,
  al editar, `updateHabit` sabe que tiene que borrarlos.

### `src/components/today-view.tsx`

- `HabitRow` cambia según el tipo de hábito:
  - **Sí / no:** la fila entera sigue siendo un botón.
  - **Medible:** la fila es un `div` con la barra de progreso y el contador.
    No puede ser un botón porque el HTML no permite botones dentro de otro
    botón.
- El borde y el fondo de acento se activan cuando se llega a la meta, porque
  usa `isDone`.

### `src/components/day-editor.tsx`

- Igual que en "Hoy": los hábitos medibles usan el contador.

### `src/components/stats-view.tsx` y `habits-manager.tsx`

- En Estadísticas, los hábitos medibles muestran "Meta 8 vasos · prom.
  6,2/día". La columna de 30 días ya era el % de días que llegaron a la meta,
  porque se calcula con `isDone`.
- En la lista de Hábitos aparece "· Meta: 8 vasos".

### Tests

- `setValue`:
  - upsert que conserva la nota;
  - en 0 borra el registro, salvo que tenga nota;
  - no baja de 0 y no acepta fechas futuras.
- `updateHabit`:
  - manda `null` al quitar la meta;
  - no toca la meta si el cambio no la trae.
- `describeTarget` y `averageValue`, incluidos el caso de hoy y la ventana
  vacía.

## Conceptos clave

- **Upsert:** se manda solo `{ habit_id, day, value }` y PostgREST ejecuta
  `INSERT … ON CONFLICT (habit_id, day) DO UPDATE` únicamente con esas
  columnas. Por eso una nota que ya existía no se pisa.
- **`undefined` frente a `null`:** en JSON, `undefined` desaparece y `null` se
  envía. Para borrar un campo en la base hay que mandar `null` de forma
  explícita.

## Verificación

- `pnpm format:check` → OK
- `pnpm typecheck` → OK
- `pnpm lint` → sin errores
- `pnpm test` → 53/53 pasan
- `pnpm build` → OK
- **No probado en el navegador ni contra Supabase real.** Esta fase necesita
  que la migración `0003` ya esté aplicada.

## Pendientes / riesgos

- **Cambiar un hábito sí/no a medible con historial:** los días que ya
  estaban marcados no tienen cantidad, así que dejan de contar y la racha se
  pierde. Es coherente con la regla, pero puede sorprender. Se podría avisar
  en el formulario.
- **Clicks muy rápidos en +:** cada click manda su propio upsert. Si dos
  requests llegan al servidor en distinto orden, podría quedar guardado un
  valor anterior. En pantalla se ve bien, y al recargar se ve lo que quedó en
  el servidor. Si pasa en la práctica, la solución es agrupar los clicks
  (debounce).
- El contador suma de a 1. Para metas grandes, como 30 minutos, conviene
  escribir la cantidad directamente.
