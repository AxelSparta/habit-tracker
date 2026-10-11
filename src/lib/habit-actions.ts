import type { SupabaseClient } from "@supabase/supabase-js";
import { todayKey } from "./dates";
import type { Completions, Entry, Frequency, Habit, HabitData } from "./types";

/**
 * Lectura y escritura de los datos en Supabase, sin React: el provider de
 * `store.tsx` sólo guarda el estado y conecta estas funciones con la sesión.
 */

export interface HabitInput {
  name: string;
  emoji: string;
  frequency: Frequency;
  /** Meta diaria; `undefined` = hábito sí/no. */
  target?: number;
  unit?: string;
}

interface HabitRow {
  id: string;
  name: string;
  emoji: string;
  frequency: Frequency;
  created_on: string;
  archived: boolean;
  position: number;
  target: number | null;
  unit: string | null;
}

interface CompletionRow {
  habit_id: string;
  day: string;
  value: number | null;
  note: string | null;
}

export const PAGE = 1000;
/** Largo máximo de una nota (igual que el `check` de la base). */
export const NOTE_MAX = 500; // Límite de filas por request de PostgREST.

function toHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    frequency: row.frequency,
    createdAt: row.created_on,
    archived: row.archived,
    position: row.position,
    ...(row.target != null && { target: row.target }),
    ...(row.unit != null && { unit: row.unit }),
  };
}

function toEntry(row: CompletionRow): Entry {
  return {
    ...(row.value != null && { value: row.value }),
    ...(row.note != null && { note: row.note }),
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
    target: habit.target ?? null,
    unit: habit.unit ?? null,
  };
}

export async function fetchAll(supabase: SupabaseClient): Promise<HabitData> {
  const { data: habits, error } = await supabase
    .from("habits")
    .select(
      "id, name, emoji, frequency, created_on, archived, position, target, unit",
    )
    .order("position")
    .order("inserted_at");
  if (error) throw error;

  const completions: Completions = {};
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("completions")
      .select("habit_id, day, value, note")
      .order("day")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    for (const c of data as CompletionRow[]) {
      (completions[c.habit_id] ??= {})[c.day] = toEntry(c);
    }
    if (data.length < PAGE) break;
  }

  return {
    version: 2,
    habits: (habits as HabitRow[]).map(toHabit),
    completions,
  };
}

/** Completados de un respaldo v1 (lista de fechas) o v2 (fecha -> registro). */
type BackupCompletions = Record<string, string[] | Record<string, Entry>>;

/**
 * Lee un respaldo JSON (v1 o v2) y lo devuelve en formato v2. En v1 cada
 * hábito tiene la lista de fechas marcadas, que pasan a registros vacíos.
 */
export function parseBackup(raw: string, current: Habit[]): HabitData {
  const data = JSON.parse(raw) as {
    habits?: Habit[];
    completions?: BackupCompletions;
  };
  if (
    !Array.isArray(data.habits) ||
    typeof data.completions !== "object" ||
    data.completions === null
  ) {
    throw new Error("Formato de datos inválido");
  }
  // Los hábitos que ya existen conservan su lugar; los nuevos van al final,
  // en el orden del respaldo (los respaldos viejos no tienen `position`).
  const existing = new Map(current.map((h) => [h.id, h.position]));
  let next = nextPosition(current);
  const completions: Completions = {};
  for (const [id, days] of Object.entries(data.completions)) {
    completions[id] = Array.isArray(days)
      ? Object.fromEntries(days.map((day) => [day, {}]))
      : days;
  }
  return {
    version: 2,
    habits: data.habits.map((h) => ({
      ...h,
      position: existing.get(h.id) ?? next++,
    })),
    completions,
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
      const { createdAt, target, unit, ...rest } = patch;
      // `undefined` no viaja en el JSON: para quitar la meta hay que mandar null.
      const row = {
        ...rest,
        ...(createdAt && { created_on: createdAt }),
        ...("target" in patch && { target: target ?? null }),
        ...("unit" in patch && { unit: unit ?? null }),
      };
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

    /**
     * Marca o desmarca un hábito sí/no. `wasDone`: si el día ya estaba
     * marcado (lo que muestra la UI). Si el día tiene nota, el registro no se
     * borra: al desmarcar queda con `value = 0` (nota sin completar).
     */
    toggleCompletion(id: string, day: string, wasDone: boolean) {
      if (day > todayKey()) return Promise.resolve();
      const entry = data?.completions[id]?.[day];
      const keepNote = wasDone && !!entry?.note;
      setData((d) => {
        const next = { ...d.completions[id] };
        if (keepNote) next[day] = { ...next[day], value: 0 };
        else if (wasDone) delete next[day];
        else next[day] = { ...(next[day]?.note && { note: next[day].note }) };
        return { ...d, completions: { ...d.completions, [id]: next } };
      });
      const completions = supabase.from("completions");
      return run(() =>
        keepNote
          ? completions.upsert({ habit_id: id, day, value: 0 })
          : wasDone
            ? completions.delete().match({ habit_id: id, day })
            : entry
              ? // Ya había registro (una nota sola): se marca sin perderla.
                completions.upsert({ habit_id: id, day, value: null })
              : completions.insert({ habit_id: id, day }),
      );
    },

    /**
     * Guarda la nota de un día. Sin registro previo crea uno con `value = 0`
     * (no cuenta como completado). Al borrar la nota, un registro que no tenía
     * nada más (`value = 0`) se elimina.
     */
    setNote(id: string, day: string, note: string) {
      if (day > todayKey()) return Promise.resolve();
      const text = note.trim().slice(0, NOTE_MAX);
      const entry = data?.completions[id]?.[day];
      if (!entry && !text) return Promise.resolve();
      if ((entry?.note ?? "") === text) return Promise.resolve();
      const remove = !text && entry?.value === 0;
      setData((d) => {
        const next = { ...d.completions[id] };
        if (remove) delete next[day];
        else {
          const updated: Entry = { ...(next[day] ?? { value: 0 }) };
          if (text) updated.note = text;
          else delete updated.note;
          next[day] = updated;
        }
        return { ...d, completions: { ...d.completions, [id]: next } };
      });
      const completions = supabase.from("completions");
      return run(() =>
        remove
          ? completions.delete().match({ habit_id: id, day })
          : completions.upsert(
              entry
                ? { habit_id: id, day, note: text || null }
                : { habit_id: id, day, value: 0, note: text },
            ),
      );
    },

    /**
     * Guarda la cantidad hecha de un hábito medible en `day`. En 0 se borra
     * el registro, salvo que tenga nota: ahí queda con `value = 0`.
     */
    setValue(id: string, day: string, value: number) {
      if (day > todayKey()) return Promise.resolve();
      const amount = Math.max(0, value);
      const entry = data?.completions[id]?.[day];
      const remove = amount === 0 && !entry?.note;
      setData((d) => {
        const next = { ...d.completions[id] };
        if (remove) delete next[day];
        else next[day] = { ...next[day], value: amount };
        return { ...d, completions: { ...d.completions, [id]: next } };
      });
      return run(() =>
        remove
          ? supabase.from("completions").delete().match({ habit_id: id, day })
          : // Upsert sólo con `value`: si ya había nota, se conserva.
            supabase
              .from("completions")
              .upsert({ habit_id: id, day, value: amount }),
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
        ([habit_id, days]) =>
          Object.entries(days).map(([day, entry]) => ({
            habit_id,
            day,
            value: entry.value ?? null,
            note: entry.note ?? null,
          })),
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
