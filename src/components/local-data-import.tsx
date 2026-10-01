"use client";

import { useEffect, useState } from "react";
import { useHabits } from "@/lib/store";

/** Clave que usaba la versión anterior (sólo localStorage). */
const LEGACY_KEY = "habit-tracker:v1";

/**
 * Si quedaron datos de la versión sin cuenta en este navegador, ofrece
 * subirlos a Supabase una sola vez.
 */
export function LocalDataImport() {
  const { data, actions } = useHabits();
  const [legacy, setLegacy] = useState<{ raw: string; count: number } | null>(
    null,
  );
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      const count = raw ? (JSON.parse(raw).habits?.length ?? 0) : 0;
      // Lectura de un sistema externo (localStorage) al montar.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw && count > 0) setLegacy({ raw, count });
    } catch {
      // localStorage no disponible o datos corruptos: no hay nada que ofrecer.
    }
  }, []);

  if (!legacy || !data) return null;

  function forget() {
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch {}
    setLegacy(null);
  }

  async function importNow() {
    setStatus("working");
    try {
      await actions.importJSON(legacy!.raw);
      forget();
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-accent/40 bg-accent-soft/30 p-4 text-sm">
      <p className="font-medium">
        Encontramos {legacy.count}{" "}
        {legacy.count === 1 ? "hábito guardado" : "hábitos guardados"} en este
        navegador.
      </p>
      <p className="mt-1 text-muted">
        ¿Querés pasarlos a tu cuenta para no perderlos y verlos en cualquier
        dispositivo?
      </p>
      {status === "error" && (
        <p className="mt-2 text-danger">
          No se pudieron importar. Probá de nuevo.
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          onClick={importNow}
          disabled={status === "working"}
          className="rounded-lg bg-accent px-3 py-1.5 font-medium text-white disabled:opacity-50"
        >
          {status === "working" ? "Importando…" : "Importar a mi cuenta"}
        </button>
        <button
          onClick={forget}
          disabled={status === "working"}
          className="rounded-lg border border-border px-3 py-1.5"
        >
          Descartar
        </button>
      </div>
    </div>
  );
}
