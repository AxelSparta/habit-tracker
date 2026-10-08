import type { SupabaseClient } from "@supabase/supabase-js";
import { todayKey } from "./dates";
import type { Frequency, Habit, HabitData } from "./types";

/**
 * Lectura y escritura de los datos en Supabase, sin React: el provider de
 * `store.tsx` sólo guarda el estado y conecta estas funciones con la sesión.
 */

export interface HabitInput {
  name: string;
  emoji: string;
  frequency: Frequency;
}

interface HabitRow {
  id: string;
  name: string;
  emoji: string;
  frequency: Frequency;
  created_on: string;
  archived: boolean;
  position: number;
}

interface CompletionRow {
  habit_id: string;
  day: string;
}

export const PAGE = 1000; // Límite de filas por request de PostgREST.

function toHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    frequency: row.frequency,
    createdAt: row.created_on,
    archived: row.archived,
    position: row.position,
  };
}

function toRow(habit: Habit): HabitRow {
  return {
    id: habit.id,
    name: habit.name,
    emoji: habit.emoji,
    frequency: habit.frequency,
    created_on: habit.createdAt,
    archived: habit.archived,
    position: habit.position,
  };
}

export async function fetchAll(supabase: SupabaseClient): Promise<HabitData> {
  const { data: habits, error } = await supabase
    .from("habits")
    .select("id, name, emoji, frequency, created_on, archived, position")
    .order("position")
    .order("inserted_at");
  if (error) throw error;

  const completions: Record<string, string[]> = {};
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("completions")
      .select("habit_id, day")
      .order("day")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    for (const c of data as CompletionRow[]) {
      (completions[c.habit_id] ??= []).push(c.day);
    }
    if (data.length < PAGE) break;
  }

  return {
    version: 1,
    habits: (habits as HabitRow[]).map(toHabit),
    completions,
  };
}

export function parseBackup(raw: string, current: Habit[]): HabitData {
  const data = JSON.parse(raw) as Partial<HabitData>;
  if (!Array.isArray(data.habits) || typeof data.completions !== "object") {
    throw new Error("Formato de datos inválido");
  }
  // Los hábitos que ya existen conservan su lugar; los nuevos van al final,
  // en el orden del respaldo (los respaldos viejos no tienen `position`).
  const existing = new Map(current.map((h) => [h.id, h.position]));
  let next = nextPosition(current);
  return {
    version: 1,
    habits: data.habits.map((h) => ({
      ...h,
      position: existing.get(h.id) ?? next++,
    })),
    completions: data.completions ?? {},
  };
}

export function nextPosition(habits: Habit[]): number {
  return habits.reduce((max, h) => Math.max(max, h.position + 1), 0);
}

export type Run = (op: () => PromiseLike<{ error: unknown }>) => Promise<void>;

/**
 * Ejecuta una escritura ya aplicada en forma optimista: si falla, avisa el
 * error y recarga del servidor para descartar el cambio local.
 */
export function createRunner(
  onError: (message: string) => void,
  reload: () => Promise<void>,
): Run {
  return async (op) => {
    const { error } = await op();
    if (error) {
      onError(messageOf(error));
      await reload();
    }
  };
}

export function createActions(
  supabase: SupabaseClient,
  data: HabitData | null,
  setData: (updater: (prev: HabitData) => HabitData) => void,
  run: Run,
  reload: () => Promise<void>,
) {
  return {
    addHabit(input: HabitInput) {
      const habit: Habit = {
        id: crypto.randomUUID(),
        ...input,
        createdAt: todayKey(),
        archived: false,
        position: nextPosition(data?.habits ?? []),
      };
      setData((d) => ({ ...d, habits: [...d.habits, habit] }));
      return run(() => supabase.from("habits").insert(toRow(habit)));
    },

    updateHabit(id: string, patch: Partial<Omit<Habit, "id">>) {
      setData((d) => ({
        ...d,
        habits: d.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
      }));
      const { createdAt, ...rest } = patch;
      const row = createdAt ? { ...rest, created_on: createdAt } : rest;
      return run(() => supabase.from("habits").update(row).eq("id", id));
    },

    deleteHabit(id: string) {
      setData((d) => {
        const completions = { ...d.completions };
        delete completions[id];
        return {
          ...d,
          habits: d.habits.filter((h) => h.id !== id),
          completions,
        };
      });
      // Los completados se borran en cascada.
      return run(() => supabase.from("habits").delete().eq("id", id));
    },

    /** `ids`: todos los hábitos (también archivados) en el nuevo orden. */
    reorderHabits(ids: string[]) {
      const before = new Map(
        (data?.habits ?? []).map((h) => [h.id, h.position]),
      );
      const changed = ids.filter((id, i) => before.get(id) !== i);
      if (changed.length === 0) return Promise.resolve();
      const order = new Map(ids.map((id, i) => [id, i]));
      setData((d) => ({
        ...d,
        habits: d.habits
          .map((h) => ({ ...h, position: order.get(h.id) ?? h.position }))
          .sort((a, b) => a.position - b.position),
      }));
      // Sólo se actualizan las filas que cambiaron de lugar.
      return run(async () => {
        const results = await Promise.all(
          changed.map((id) =>
            supabase
              .from("habits")
              .update({ position: order.get(id) })
              .eq("id", id),
          ),
        );
        return { error: results.find((r) => r.error)?.error ?? null };
      });
    },

    /** `wasDone`: si el día ya estaba marcado (lo que muestra la UI). */
    toggleCompletion(id: string, day: string, wasDone: boolean) {
      setData((d) => {
        const current = d.completions[id] ?? [];
        const next = wasDone
          ? current.filter((x) => x !== day)
          : [...current, day].sort();
        return { ...d, completions: { ...d.completions, [id]: next } };
      });
      return run(() =>
        wasDone
          ? supabase.from("completions").delete().match({ habit_id: id, day })
          : supabase.from("completions").insert({ habit_id: id, day }),
      );
    },

    /** Agrega (o actualiza) los hábitos y completados de un respaldo JSON. */
    async importJSON(raw: string) {
      const backup = parseBackup(raw, data?.habits ?? []);
      const { error } = await supabase
        .from("habits")
        .upsert(backup.habits.map(toRow));
      if (error) throw error;
      const rows = Object.entries(backup.completions).flatMap(
        ([habit_id, days]) => days.map((day) => ({ habit_id, day })),
      );
      for (let i = 0; i < rows.length; i += PAGE) {
        const { error } = await supabase
          .from("completions")
          .upsert(rows.slice(i, i + PAGE), { ignoreDuplicates: true });
        if (error) throw error;
      }
      await reload();
    },
  };
}

export type HabitActions = ReturnType<typeof createActions>;

export function messageOf(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String(e.message);
  return "Ocurrió un error inesperado";
}
