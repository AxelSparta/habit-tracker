"use client";

import { useAuth } from "@clerk/nextjs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createActions,
  createRunner,
  fetchAll,
  messageOf,
  type HabitActions,
} from "./habit-actions";
import { useSupabase } from "./supabase";
import type { HabitData } from "./types";

export type { HabitActions, HabitInput } from "./habit-actions";

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
        data,
        (updater) =>
          setLoaded((prev) =>
            prev ? { ...prev, data: updater(prev.data) } : prev,
          ),
        createRunner(setError, reload),
        reload,
      ),
    [supabase, data, reload],
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
