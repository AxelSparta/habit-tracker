import {
  WEEKDAY_SHORT,
  addDays,
  dayRange,
  startOfWeek,
  weekdayOf,
} from "./dates";
import type { Completions, Entry, Frequency, Habit } from "./types";

/**
 * Un "período" es la unidad en la que se mide la racha de un hábito:
 * - Hábitos diarios o de días fijos: cada día programado.
 * - Hábitos de "N veces por semana": cada semana (lunes a domingo).
 *
 * `pending` sólo aparece en el último período (hoy / esta semana) cuando todavía
 * no se cumplió: no suma a la racha pero tampoco la corta.
 */
export type PeriodStatus = "done" | "missed" | "pending";

export interface Period {
  /** Fecha del día, o del lunes de la semana para hábitos semanales. */
  key: string;
  status: PeriodStatus;
}

/**
 * Un día cuenta como completado si tiene registro y:
 * - en hábitos medibles, el valor llega a la meta;
 * - en hábitos sí/no, el valor no es 0 (sin valor = marcado). El 0 queda para
 *   registros que sólo guardan una nota.
 */
export function isDone(habit: Habit, entry: Entry | undefined): boolean {
  if (!entry) return false;
  if (habit.target != null) return (entry.value ?? 0) >= habit.target;
  return entry.value !== 0;
}

/** Fechas en que el hábito quedó completado: la fuente de las rachas. */
export function doneDays(
  habit: Habit,
  entries: Record<string, Entry> | undefined,
): Set<string> {
  const days = new Set<string>();
  for (const [day, entry] of Object.entries(entries ?? {})) {
    if (isDone(habit, entry)) days.add(day);
  }
  return days;
}

export type StreakUnit = "días" | "semanas";

export function streakUnit(habit: Habit): StreakUnit {
  return habit.frequency.type === "timesPerWeek" ? "semanas" : "días";
}

/** Indica si el hábito tiene un día fijo programado en `day`. */
export function isScheduledOn(habit: Habit, day: string): boolean {
  if (day < habit.createdAt) return false;
  switch (habit.frequency.type) {
    case "daily":
      return true;
    case "weekdays":
      return habit.frequency.days.includes(weekdayOf(day));
    case "timesPerWeek":
      return false;
  }
}

/**
 * Indica si el hábito se puede marcar en `day`: ya existía y ese día le toca
 * (los semanales se pueden marcar cualquier día de la semana).
 */
export function appliesOn(habit: Habit, day: string): boolean {
  if (day < habit.createdAt) return false;
  return habit.frequency.type === "timesPerWeek" || isScheduledOn(habit, day);
}

/** Cantidad de veces completado en la semana que contiene `day`. */
export function weekCount(done: Set<string>, day: string): number {
  const monday = startOfWeek(day);
  let count = 0;
  for (let i = 0; i < 7; i++) if (done.has(addDays(monday, i))) count++;
  return count;
}

export function getPeriods(
  habit: Habit,
  done: Set<string>,
  today: string,
): Period[] {
  if (habit.createdAt > today) return [];

  if (habit.frequency.type === "timesPerWeek") {
    const target = habit.frequency.count;
    const current = startOfWeek(today);
    const periods: Period[] = [];
    for (
      let w = startOfWeek(habit.createdAt);
      w <= current;
      w = addDays(w, 7)
    ) {
      const met = weekCount(done, w) >= target;
      const status = met ? "done" : w === current ? "pending" : "missed";
      periods.push({ key: w, status });
    }
    return periods;
  }

  return dayRange(habit.createdAt, today)
    .filter((day) => isScheduledOn(habit, day))
    .map((day) => ({
      key: day,
      status: done.has(day) ? "done" : day === today ? "pending" : "missed",
    }));
}

export function currentStreak(periods: Period[]): number {
  let streak = 0;
  for (let i = periods.length - 1; i >= 0; i--) {
    const { status } = periods[i];
    if (status === "pending") continue;
    if (status === "missed") break;
    streak++;
  }
  return streak;
}

export function bestStreak(periods: Period[]): number {
  let best = 0;
  let run = 0;
  for (const { status } of periods) {
    if (status === "done") best = Math.max(best, ++run);
    else if (status === "missed") run = 0;
  }
  return best;
}

/**
 * Cuenta los períodos cumplidos y evaluables dentro de los últimos `days` días.
 * Para hábitos semanales cuentan las semanas que empiezan en esa ventana o la
 * contienen. Los períodos pendientes no cuentan.
 */
export function countInWindow(
  habit: Habit,
  periods: Period[],
  today: string,
  days: number,
): { done: number; total: number } {
  let from = addDays(today, -(days - 1));
  if (habit.frequency.type === "timesPerWeek") from = startOfWeek(from);
  let done = 0;
  let total = 0;
  for (const p of periods) {
    if (p.key < from || p.status === "pending") continue;
    total++;
    if (p.status === "done") done++;
  }
  return { done, total };
}

/** Porcentaje (0–1) de períodos cumplidos en la ventana, o `null` si no hay. */
export function completionRate(
  habit: Habit,
  periods: Period[],
  today: string,
  days: number,
): number | null {
  const { done, total } = countInWindow(habit, periods, today, days);
  return total === 0 ? null : done / total;
}

export interface GlobalDay {
  key: string;
  status: PeriodStatus;
}

/**
 * Racha general: días consecutivos en los que se completaron TODOS los hábitos
 * con día fijo programado. Los días sin hábitos programados se saltean y los
 * hábitos semanales ("N veces por semana") no participan.
 */
export function getGlobalDays(
  habits: Habit[],
  completions: Completions,
  today: string,
): GlobalDay[] {
  const active = habits.filter(
    (h) => !h.archived && h.frequency.type !== "timesPerWeek",
  );
  if (active.length === 0) return [];
  const sets = new Map(
    active.map((h) => [h.id, doneDays(h, completions[h.id])]),
  );
  const first = active.reduce(
    (min, h) => (h.createdAt < min ? h.createdAt : min),
    today,
  );

  const result: GlobalDay[] = [];
  for (const day of dayRange(first, today)) {
    const due = active.filter((h) => isScheduledOn(h, day));
    if (due.length === 0) continue;
    const allDone = due.every((h) => sets.get(h.id)!.has(day));
    result.push({
      key: day,
      status: allDone ? "done" : day === today ? "pending" : "missed",
    });
  }
  return result;
}

/** Número con hasta un decimal, en formato local (ej. "2,5"). */
export function formatAmount(n: number): string {
  return n.toLocaleString("es-AR", { maximumFractionDigits: 1 });
}

/** Meta de un hábito medible, ej. "8 vasos"; `null` en hábitos sí/no. */
export function describeTarget(habit: Habit): string | null {
  if (habit.target == null) return null;
  return [formatAmount(habit.target), habit.unit].filter(Boolean).join(" ");
}

/** Suma de las cantidades registradas entre `from` y `to` (incluidos). */
export function sumValues(
  entries: Record<string, Entry> | undefined,
  from = "",
  to = "9999-12-31",
): number {
  let sum = 0;
  for (const [day, entry] of Object.entries(entries ?? {})) {
    if (day >= from && day <= to) sum += entry.value ?? 0;
  }
  return sum;
}

const MINUTE_UNITS = ["min", "mins", "minuto", "minutos"];

/**
 * Cantidad con la unidad del hábito. Los minutos se pasan a horas cuando
 * llegan a 60 (ej. "20 h 40 min"), así los totales de tiempo se leen mejor.
 */
export function formatQuantity(habit: Habit, n: number): string {
  const unit = habit.unit?.trim();
  if (unit && MINUTE_UNITS.includes(unit.toLowerCase()) && n >= 60) {
    const total = Math.round(n);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m === 0
      ? `${h.toLocaleString("es-AR")} h`
      : `${h.toLocaleString("es-AR")} h ${m} min`;
  }
  return [formatAmount(n), unit].filter(Boolean).join(" ");
}

/**
 * Promedio de un hábito medible en los últimos `days` días, contando sólo los
 * días con una cantidad registrada: "cuando lo hago, ¿cuánto hago?". Los días
 * sin cantidad (o con 0, como una nota sola) no cuentan.
 */
export function averageValue(
  entries: Record<string, Entry> | undefined,
  today: string,
  days: number,
): number | null {
  let sum = 0;
  let count = 0;
  for (const value of rangeValues(
    entries,
    addDays(today, -(days - 1)),
    today,
  )) {
    sum += value;
    count++;
  }
  return count === 0 ? null : sum / count;
}

/** Cantidades mayores que 0 registradas entre `from` y `to`. */
function rangeValues(
  entries: Record<string, Entry> | undefined,
  from: string,
  to: string,
): number[] {
  return Object.entries(entries ?? {})
    .filter(([day, e]) => day >= from && day <= to && (e.value ?? 0) > 0)
    .map(([, e]) => e.value!);
}

export interface DayNote {
  habit: Habit;
  day: string;
  note: string;
}

/** Notas de los hábitos dados, de la más reciente a la más vieja. */
export function collectNotes(
  habits: Habit[],
  completions: Completions,
): DayNote[] {
  const notes: DayNote[] = [];
  for (const habit of habits) {
    for (const [day, entry] of Object.entries(completions[habit.id] ?? {})) {
      if (entry.note) notes.push({ habit, day, note: entry.note });
    }
  }
  // Mismo día: respeta el orden de los hábitos.
  return notes.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
}

export function describeFrequency(frequency: Frequency): string {
  switch (frequency.type) {
    case "daily":
      return "Todos los días";
    case "weekdays": {
      const days = [...frequency.days].sort();
      if (days.length === 7) return "Todos los días";
      if (days.join() === "0,1,2,3,4") return "Lunes a viernes";
      if (days.join() === "5,6") return "Fines de semana";
      return days.map((d) => WEEKDAY_SHORT[d]).join(" · ");
    }
    case "timesPerWeek":
      return `${frequency.count} ${frequency.count === 1 ? "vez" : "veces"} por semana`;
  }
}

/**
 * Aplica el nuevo orden de una lista filtrada (`subset`) al orden completo
 * (`all`): los elementos del subconjunto ocupan los mismos lugares que antes,
 * pero en el orden nuevo; el resto no se mueve.
 */
export function reorderSubset(all: string[], subset: string[]): string[] {
  const members = new Set(subset);
  let i = 0;
  return all.map((id) => (members.has(id) ? subset[i++] : id));
}
