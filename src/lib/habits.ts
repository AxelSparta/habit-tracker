import {
  WEEKDAY_SHORT,
  addDays,
  dayRange,
  startOfWeek,
  weekdayOf,
} from "./dates";
import type { Frequency, Habit } from "./types";

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
  completions: Record<string, string[]>,
  today: string,
): GlobalDay[] {
  const active = habits.filter(
    (h) => !h.archived && h.frequency.type !== "timesPerWeek",
  );
  if (active.length === 0) return [];
  const sets = new Map(active.map((h) => [h.id, new Set(completions[h.id])]));
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
