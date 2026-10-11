# Promedio de hábitos medibles: solo días con registro

**Fecha:** 2026-10-10
**Rama:** main

## Resumen

El promedio de los hábitos medibles ahora cuenta solo los días con una cantidad
registrada. Responde a "cuando lo hago, ¿cuánto hago?". Antes también contaba
como 0 los días en que el hábito tocaba y no se registró nada.

## Cambios

### `src/lib/habits.ts`

- `averageValue(entries, today, days)` ya no recibe el hábito. Promedia las
  cantidades mayores que 0 de los últimos `days` días.
- Las cantidades del rango las junta una función interna nueva, `rangeValues`.
- **Por qué mayores que 0:** un registro con `value = 0` es una nota sin
  completar (fase 4). No es una sesión, así que no tiene que bajar el
  promedio.
- **Por qué para todos los hábitos y no solo los de "N veces por semana":**
  así lo pidió el usuario. Además da una sola regla, fácil de explicar, para
  cualquier frecuencia.

### `src/components/measurable-stats.tsx` y `stats-view.tsx`

- La tarjeta dice "Prom. por día registrado". Al pasar el mouse, un `title`
  aclara que es sobre los últimos 30 días.
- En la tabla "Por hábito", el texto pasa de "prom. X/día" a "prom. X por día
  registrado".

### Tests (`habits.test.ts`)

- Hay casos para:
  - días fuera de la ventana de 30 días, que no cuentan;
  - días sin registro;
  - un registro con nota y `value = 0`;
  - hoy con registro, que sí cuenta;
  - ventanas sin ninguna cantidad, que devuelven `null`.

## Verificación

- `pnpm typecheck`, `pnpm lint`, `pnpm test` (56/56 en ese momento) → OK.

## Pendientes / riesgos

- El promedio ya no muestra la constancia: si estudiás 120 min un solo día del
  mes, da "2 h". La constancia queda en la columna de 30 días (% de días que
  llegaron a la meta) y en las rachas.
