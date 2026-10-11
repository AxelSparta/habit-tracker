# Estadísticas de hábitos medibles

**Fecha:** 2026-10-10
**Rama:** main

## Resumen

Estadísticas suma una sección "Hábitos medibles" con una tarjeta por cada
hábito medible activo. Cada tarjeta muestra el total de esta semana, de este
mes y desde que existe el hábito, el promedio diario de los últimos 30 días y
un gráfico con el total de cada semana de las últimas 12. Los minutos se
muestran en horas cuando llegan a 60 (ej. "20 h 40 min").

## Cambios

### `src/lib/dates.ts`

- `startOfMonth(key)`: devuelve el día 1 del mes de la fecha.

### `src/lib/habits.ts`

- `sumValues(entries, from?, to?)`: suma las cantidades entre dos fechas,
  incluidas. Sin fechas, suma todo.
- `formatQuantity(habit, n)`: muestra el número con la unidad del hábito.
  - Si la unidad es "min", "mins", "minuto" o "minutos" y el número llega a 60,
    lo pasa a horas: "2 h", "20 h 40 min".
  - Con cualquier otra unidad muestra "1.500 vasos", "2,5 km", etc.
- **Por qué solo minutos:** la pregunta típica es "¿cuánto estudié?", y 1240
  min no se entiende de un vistazo. Las demás unidades no tienen una
  conversión obvia.

### `src/components/measurable-stats.tsx` (nuevo)

- Una tarjeta por hábito medible activo:
  - fila con "Esta semana", "Este mes", "Total" y "Promedio (30 días) / día";
  - gráfico de barras con el total semanal de las últimas 12 semanas.
- "Esta semana" y "Este mes" son períodos de calendario: desde el lunes y
  desde el día 1. No son los últimos 7 o 30 días, porque así se responde
  "¿cuánto llevo este mes?".
- Si no hay hábitos medibles activos, la sección no aparece.

### `src/components/stats-view.tsx`

- Muestra `<MeasurableStats>` al final, debajo de la tabla "Por hábito".

### `src/components/charts.tsx`

- `WeeklyBars` acepta dos props nuevas, para reutilizarlo con cantidades y no
  solo con check-ins:
  - `label`: el texto que lee el lector de pantalla;
  - `format`: cómo se muestra el valor en el tooltip.
- Los valores por defecto mantienen el gráfico de check-ins igual que antes.
- Los números del eje y de la última barra pasan a formato local, así que los
  decimales salen con coma.
- **`niceTicks` reescrito:** antes elegía el paso de una lista fija que
  terminaba en 200, así que 3000 minutos daban 16 marcas en el eje. Ahora el
  paso es 1, 2 o 5 × 10ⁿ, siempre quedan entre 2 y 5 marcas, y funciona para
  cualquier escala: 4 → 0…4, 600 → 0/200/400/600, 3000 → 0/1000/2000/3000.

### Tests (`habits.test.ts`)

- `sumValues`: suma todo, desde una fecha, en un rango, sin registros, y con
  registros que tienen nota pero no cantidad.
- `formatQuantity`: minutos a horas, unidad en mayúsculas, otras unidades,
  sin unidad y separador de miles.

## Conceptos clave

- **Escala "linda" en los ejes:** se divide el máximo por la cantidad de
  marcas deseadas (4), se toma su orden de magnitud (10ⁿ) y se elige el menor
  de 1, 2, 5 o 10 × 10ⁿ que alcance. Es el método clásico de los gráficos
  ("nice numbers").

## Verificación

- `pnpm format:check` → OK
- `pnpm typecheck` → OK
- `pnpm lint` → sin errores
- `pnpm test` → 56/56 pasan
- `pnpm build` → OK
- **No probado en el navegador.**

## Pendientes / riesgos

- En el gráfico, el eje y la etiqueta de la última barra siguen en la unidad
  original (ej. minutos), aunque las tarjetas muestren horas. El tooltip sí
  usa el formato en horas.
- Los hábitos archivados no aparecen en esta sección. Su historial se
  conserva, pero hay que restaurarlos para ver sus totales.
- Si después se quiere comparar contra el período anterior (ej. "+20 % que
  la semana pasada"), `sumValues` ya alcanza para calcularlo.
