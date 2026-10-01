"use client";

import { useRef, useState } from "react";
import { describeFrequency } from "@/lib/habits";
import { useHabits } from "@/lib/store";
import type { Habit } from "@/lib/types";
import { HabitForm } from "./habit-form";
import { Card, Loading } from "./ui";

export function HabitsManager() {
  const { data, actions } = useHabits();
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!data) return <Loading />;

  const active = data.habits.filter((h) => !h.archived);
  const archived = data.habits.filter((h) => h.archived);

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `habitos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importData(file: File) {
    setImporting(true);
    try {
      await actions.importJSON(await file.text());
      setImportError(null);
    } catch (e) {
      setImportError(
        e instanceof SyntaxError ||
          (e instanceof Error && e.message.includes("Formato"))
          ? "El archivo no tiene un formato válido."
          : "No se pudo importar el respaldo. Probá de nuevo.",
      );
    } finally {
      setImporting(false);
    }
  }

  function renderHabit(h: Habit) {
    if (editing === h.id) {
      return (
        <Card key={h.id}>
          <HabitForm
            initial={h}
            submitLabel="Guardar"
            onSubmit={(input) => {
              actions.updateHabit(h.id, input);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        </Card>
      );
    }
    return (
      <li
        key={h.id}
        className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
      >
        <span className="text-2xl" aria-hidden>
          {h.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{h.name}</p>
          <p className="text-xs text-muted">{describeFrequency(h.frequency)}</p>
        </div>
        <div className="flex gap-1 text-sm">
          {confirmDelete === h.id ? (
            <>
              <button
                onClick={() => actions.deleteHabit(h.id)}
                className="rounded-md bg-danger px-2 py-1 text-white"
              >
                Borrar todo
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-md px-2 py-1 text-muted hover:text-foreground"
              >
                No
              </button>
            </>
          ) : (
            <>
              {!h.archived && (
                <button
                  onClick={() => setEditing(h.id)}
                  className="rounded-md px-2 py-1 text-muted hover:bg-surface-2 hover:text-foreground"
                >
                  Editar
                </button>
              )}
              <button
                onClick={() =>
                  actions.updateHabit(h.id, { archived: !h.archived })
                }
                className="rounded-md px-2 py-1 text-muted hover:bg-surface-2 hover:text-foreground"
              >
                {h.archived ? "Restaurar" : "Archivar"}
              </button>
              <button
                onClick={() => setConfirmDelete(h.id)}
                className="rounded-md px-2 py-1 text-danger hover:bg-surface-2"
              >
                Borrar
              </button>
            </>
          )}
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Hábitos</h1>
        <p className="text-sm text-muted">
          Creá hábitos diarios, para días puntuales o con una meta semanal.
        </p>
      </div>

      <Card>
        <h2 className="mb-4 font-semibold">Nuevo hábito</h2>
        <HabitForm submitLabel="Crear hábito" onSubmit={actions.addHabit} />
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">
          Activos ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay hábitos activos.</p>
        ) : (
          <ul className="space-y-2">{active.map(renderHabit)}</ul>
        )}
      </section>

      {archived.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">
            Archivados ({archived.length})
          </h2>
          <ul className="space-y-2 opacity-70">{archived.map(renderHabit)}</ul>
        </section>
      )}

      <Card>
        <h2 className="font-semibold">Respaldo</h2>
        <p className="mt-1 text-sm text-muted">
          Tus datos se guardan en tu cuenta. Podés exportarlos como JSON o
          importar un respaldo (se suma a lo que ya tenés).
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <button
            onClick={exportData}
            className="rounded-lg border border-border px-3 py-1.5 hover:bg-surface-2"
          >
            Exportar JSON
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="rounded-lg border border-border px-3 py-1.5 hover:bg-surface-2 disabled:opacity-50"
          >
            {importing ? "Importando…" : "Importar JSON"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importData(file);
              e.target.value = "";
            }}
          />
        </div>
        {importError && (
          <p className="mt-2 text-sm text-danger">{importError}</p>
        )}
      </Card>
    </div>
  );
}
