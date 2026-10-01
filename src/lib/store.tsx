"use client";

import { useAuth } from "@clerk/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { todayKey } from "./dates";
import { useSupabase } from "./supabase";
import type { Frequency, Habit, HabitData } from "./types";

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
}

interface CompletionRow {
  habit_id: string;
  day: string;
}

const PAGE = 1000; // Límite de filas por request de PostgREST.

function toHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    frequency: row.frequency,
    createdAt: row.created_on,
    archived: row.archived,
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
  };
}

async function fetchAll(supabase: SupabaseClient): Promise<HabitData> {
  const { data: habits, error } = await supabase
    .from("habits")
    .select("id, name, emoji, frequency, created_on, archived")
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

function parseBackup(raw: string): HabitData {
  const data = JSON.parse(raw) as Partial<HabitData>;
  if (!Array.isArray(data.habits) || typeof data.completions !== "object") {
    throw new Error("Formato de datos inválido");
  }
  return {
    version: 1,
    habits: data.habits,
    completions: data.completions ?? {},
  };
}

function createActions(
  supabase: SupabaseClient,
  setData: (updater: (prev: HabitData) => HabitData) => void,
  run: (op: () => PromiseLike<{ error: unknown }>) => Promise<void>,
  reload: () => Promise<void>,
) {
  return {
    addHabit(input: HabitInput) {
      const habit: Habit = {
        id: crypto.randomUUID(),
        ...input,
        createdAt: todayKey(),
        archived: false,
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
      const backup = parseBackup(raw);
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

interface HabitStore {
  /** `null` mientras se cargan los datos. */
  data: HabitData | null;
  error: string | null;
  actions: HabitActions;
  dismissError: () => void;
}

const HabitStoreContext = createContext<HabitStore | null>(null);

export function HabitStoreProvider({ children }: { children: ReactNode }) {
  const supabase = useSupabase();
  const { isSignedIn, userId } = useAuth();
  // Los datos se guardan junto al usuario dueño: si cambia la sesión, los
  // datos anteriores dejan de mostrarse sin tener que resetearlos.
  const [loaded, setLoaded] = useState<{
    userId: string;
    data: HabitData;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const data = loaded && loaded.userId === userId ? loaded.data : null;

  const reload = useCallback(async () => {
    if (!userId) return;
    try {
      setLoaded({ userId, data: await fetchAll(supabase) });
    } catch (e) {
      setError(messageOf(e));
    }
  }, [supabase, userId]);

  useEffect(() => {
    if (!isSignedIn || !userId) return;
    // Si cambia el usuario antes de que termine la carga, se descarta.
    let cancelled = false;
    fetchAll(supabase).then(
      (d) => !cancelled && setLoaded({ userId, data: d }),
      (e) => !cancelled && setError(messageOf(e)),
    );
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, userId, supabase]);

  const actions = useMemo(
    () =>
      createActions(
        supabase,
        (updater) =>
          setLoaded((prev) =>
            prev ? { ...prev, data: updater(prev.data) } : prev,
          ),
        async (op) => {
          // Actualización optimista: si falla, se avisa y se recarga del servidor.
          const { error } = await op();
          if (error) {
            setError(messageOf(error));
            await reload();
          }
        },
        reload,
      ),
    [supabase, reload],
  );

  const value = useMemo(
    () => ({ data, error, actions, dismissError: () => setError(null) }),
    [data, error, actions],
  );

  return (
    <HabitStoreContext.Provider value={value}>
      {children}
    </HabitStoreContext.Provider>
  );
}

export function useHabits(): HabitStore {
  const store = useContext(HabitStoreContext);
  if (!store)
    throw new Error("useHabits debe usarse dentro de HabitStoreProvider");
  return store;
}

function messageOf(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String(e.message);
  return "Ocurrió un error inesperado";
}
