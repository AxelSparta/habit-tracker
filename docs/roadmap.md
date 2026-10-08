# Roadmap

Plan para terminar la base del proyecto y sumar las funcionalidades nuevas. Las
fases están ordenadas por dependencias: cada una deja la app desplegable y con
los checks en verde (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`).

| Fase | Qué                                   | Depende de | Migración |
| ---- | ------------------------------------- | ---------- | --------- |
| 0    | Cierre de la base: CI, deploy, tests  | —          | —         |
| 1    | Editar el historial desde el heatmap  | 0          | —         |
| 2    | Modelo de datos v2 (valor + nota)     | 0          | `0003`    |
| 3    | Hábitos medibles                      | 2          | —         |
| 4    | Notas por check-in                    | 2          | —         |
| 5    | PWA instalable                        | 0 (deploy) | —         |
| 6    | Recordatorios con notificaciones push | 5          | `0004`    |

---

## Fase 0 — Cierre de la base

Objetivo: que cada cambio se verifique solo y que haya una versión en
producción antes de tocar el modelo de datos.

- [x] README: pasar los comandos de `npm` a `pnpm` (el repo sólo tiene
      `pnpm-lock.yaml`).
- [x] CI en `.github/workflows/ci.yml`: `pnpm install --frozen-lockfile`,
      formato, lint, typecheck, test y build en cada push y PR. El build usa
      valores falsos para las variables públicas: no hacen falta secrets.
- [x] Deploy en Vercel con las variables de `.env.example`. Agregar el dominio
      de producción en Clerk.
- [x] Tests del store: la lógica de datos pasó a `src/lib/habit-actions.ts`
      y se testea con un cliente de Supabase falso, incluido el rollback de
      las escrituras optimistas.

**Terminado cuando:** el CI corre en verde en `main` y la app funciona en la
URL de producción con una cuenta real.

## Fase 1 — Editar el historial desde el heatmap

Sin cambios de esquema. Hoy los días pasados sólo se marcan con las flechas de
"Hoy".

- [ ] En `charts.tsx`, hacer clickeables las celdas del heatmap (con soporte de
      teclado y `aria-label` con la fecha).
- [ ] Al elegir un día, abrir un panel con los hábitos que aplicaban esa fecha
      (respetando `createdAt` y la frecuencia) para marcar/desmarcar.
- [ ] Reusar la acción de toggle del store; no permitir fechas futuras.

**Terminado cuando:** se puede corregir cualquier día pasado desde
Estadísticas y las rachas se recalculan al instante.

## Fase 2 — Modelo de datos v2

Base común para hábitos medibles y notas. Conviene hacerla en un solo paso para
no migrar dos veces.

- [ ] Migración `supabase/migrations/0003_values_notes.sql`:
  - `habits`: `target numeric` (null = hábito sí/no) y `unit text`
    (ej. "vasos", "min").
  - `completions`: `value numeric` y `note text` (con `check` de largo, ej.
    ≤ 500).
- [ ] `types.ts`: `Habit` suma `target?` y `unit?`; `HabitData` pasa a
      `version: 2` con `completions: Record<habitId, Record<fecha, Entry>>`
      donde `Entry = { value?: number; note?: string }`.
- [ ] `habits.ts`: un día cuenta como completado si existe la entrada y, en
      hábitos medibles, `value >= target`. Las rachas no cambian de lógica, sólo
      de fuente.
- [ ] `store.tsx`: `fetchAll` trae `value` y `note`; `parseBackup` acepta
      respaldos v1 (lista de fechas) y los convierte a v2.
- [ ] Tests: conversión v1 → v2 y rachas con hábitos medibles parcialmente
      cumplidos.

**Terminado cuando:** la app funciona igual que antes con datos existentes y
los respaldos viejos se importan bien. Ejecutar `0003` en Supabase antes del
deploy.

## Fase 3 — Hábitos medibles

- [ ] `habit-form.tsx`: opción "Medible" con meta numérica y unidad.
- [ ] `today-view.tsx`: en vez del check, un contador (− / +) o input numérico
      con progreso `3 / 8 vasos`; se marca completo al llegar a la meta.
- [ ] Estadísticas: para medibles, mostrar promedio diario y % de días que
      alcanzaron la meta.

**Terminado cuando:** un hábito "8 vasos de agua" se puede cargar de a uno y la
racha sólo cuenta los días con 8 o más.

## Fase 4 — Notas por check-in

- [ ] Ícono de nota en cada hábito de "Hoy" (y en el panel de la fase 1) que
      abre un textarea; se guarda en `completions.note`.
- [ ] Decidir si una nota sin completar es válida. Propuesta: sí, como una
      entrada con `value = 0` que no cuenta para la racha (requiere ajustar la
      regla de la fase 2: "completado" = sí/no marcado o meta alcanzada).
- [ ] Indicador en el heatmap de los días con nota y lista de notas recientes
      por hábito en Estadísticas.

**Terminado cuando:** se puede escribir, editar y ver la nota de cualquier día.

## Fase 5 — PWA instalable

Ver `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md`
antes de empezar.

- [ ] `src/app/manifest.ts` con nombre, colores del tema, `display:
"standalone"` e íconos 192/512 (y maskable) en `public/`.
- [ ] Service worker (`public/sw.js`) registrado desde un componente cliente:
      cache del shell de la app para que abra sin conexión. Los datos siguen
      viniendo de Supabase.
- [ ] Revisar que Clerk y `proxy.ts` no bloqueen `manifest.webmanifest`,
      `sw.js` ni los íconos.
- [ ] Probar instalación en Android (Chrome) e iOS (Safari → "Agregar a
      inicio").

**Terminado cuando:** Lighthouse marca la app como instalable y se abre como
app independiente en el celular.

## Fase 6 — Recordatorios con notificaciones push

La más compleja: necesita servidor, programación periódica y el service worker
de la fase 5. En iOS sólo funciona con la PWA instalada (iOS 16.4+).

- [ ] Migración `0004_reminders.sql`:
  - `habits.reminder_time time` (null = sin recordatorio).
  - Tabla `push_subscriptions` (`user_id`, `endpoint`, `p256dh`, `auth`,
    `timezone`), con RLS igual a las demás.
- [ ] Claves VAPID en variables de entorno; el cliente pide permiso y guarda la
      suscripción.
- [ ] Service worker: manejar `push` (mostrar la notificación) y
      `notificationclick` (abrir "Hoy").
- [ ] Route handler protegido (ej. `src/app/api/reminders/route.ts`) que cada
      15 min busca hábitos con recordatorio en esa franja según la zona horaria
      del usuario, que apliquen hoy y no estén completos, y envía el push con
      `web-push`. Usa la service role key de Supabase sólo en el servidor.
- [ ] Disparo periódico con Vercel Cron (o `pg_cron` en Supabase) y un secreto
      compartido para que nadie más pueda llamar al endpoint.
- [ ] Borrar suscripciones que devuelven 404/410.
- [ ] Formulario de hábito: campo de hora del recordatorio; ajustes para
      activar/desactivar notificaciones.

**Terminado cuando:** un hábito con recordatorio a las 21:00 avisa en el
celular a esa hora si no está marcado, y no avisa si ya lo está.

---

## Riesgos

- **Migraciones manuales:** cada fase con migración requiere ejecutarla en
  Supabase antes del deploy, o la app falla al cargar. Considerar
  `supabase db push` en el CI más adelante.
- **Zona horaria:** las fechas se guardan en hora local del usuario. Los
  recordatorios necesitan guardar la zona horaria explícitamente.
- **Plan de Vercel:** el cron cada 15 min puede requerir plan pago; la
  alternativa es `pg_cron` + Edge Function de Supabase.
