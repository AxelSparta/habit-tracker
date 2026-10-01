import type { Weekday } from "./types";

/** Clave de fecha YYYY-MM-DD en hora local. */
export function toKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, amount: number): string {
  const date = fromKey(key);
  date.setDate(date.getDate() + amount);
  return toKey(date);
}

export function todayKey(): string {
  return toKey(new Date());
}

/** Día de la semana con lunes = 0. */
export function weekdayOf(key: string): Weekday {
  return ((fromKey(key).getDay() + 6) % 7) as Weekday;
}

/** Lunes de la semana que contiene `key`. */
export function startOfWeek(key: string): string {
  return addDays(key, -weekdayOf(key));
}

/** Lista de fechas desde `from` hasta `to`, ambas incluidas. */
export function dayRange(from: string, to: string): string[] {
  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}

export const WEEKDAY_SHORT = ["L", "M", "X", "J", "V", "S", "D"] as const;
export const WEEKDAY_NAMES = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
] as const;

export function formatLong(key: string): string {
  const text = fromKey(key).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatShort(key: string): string {
  return fromKey(key).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
}
