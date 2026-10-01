"use client";

import { useHabits } from "@/lib/store";

export function ErrorBanner() {
  const { error, dismissError } = useHabits();
  if (!error) return null;
  return (
    <div
      role="alert"
      className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm"
    >
      <p>
        <span className="font-medium">
          No se pudo sincronizar con la base de datos.
        </span>{" "}
        <span className="text-muted">{error}</span>
      </p>
      <button
        onClick={dismissError}
        className="text-muted hover:text-foreground"
        aria-label="Cerrar"
      >
        ✕
      </button>
    </div>
  );
}
