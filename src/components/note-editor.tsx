"use client";

import { useState } from "react";
import { NOTE_MAX } from "@/lib/habit-actions";

/** Botón para abrir la nota de un hábito en un día. */
export function NoteButton({
  hasNote,
  open,
  onClick,
  habitName,
  disabled = false,
  rounded = "rounded-r-xl",
}: {
  hasNote: boolean;
  open: boolean;
  onClick: () => void;
  habitName: string;
  disabled?: boolean;
  /** Redondeo del lado derecho, igual al de la fila que lo contiene. */
  rounded?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-expanded={open}
      aria-label={`${hasNote ? "Editar" : "Agregar"} nota de ${habitName}`}
      title={hasNote ? "Editar nota" : "Agregar nota"}
      className={`flex w-10 shrink-0 items-center justify-center self-stretch text-base ${rounded} transition-opacity hover:bg-surface-2 disabled:cursor-not-allowed disabled:hover:bg-transparent ${
        hasNote || open ? "opacity-100" : "opacity-40 hover:opacity-100"
      }`}
    >
      <span aria-hidden>📝</span>
    </button>
  );
}

/** Texto de una nota guardada, en una línea. */
export function NotePreview({ note }: { note: string }) {
  return (
    <span className="mt-0.5 block truncate text-xs text-muted italic">
      “{note}”
    </span>
  );
}

/**
 * Textarea para escribir la nota del día. Guarda con el botón o Ctrl/⌘+Enter;
 * Escape cancela. Dejarla vacía y guardar la borra.
 */
export function NoteEditor({
  initial,
  onSave,
  onClose,
}: {
  initial: string;
  onSave: (note: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(initial);

  function save(value = text) {
    onSave(value);
    onClose();
  }

  return (
    <div className="space-y-2 px-3 pb-3">
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save();
          if (e.key === "Escape") onClose();
        }}
        maxLength={NOTE_MAX}
        rows={3}
        placeholder="¿Cómo te fue? (ej. me costó arrancar)"
        aria-label="Nota del día"
        className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <div className="flex items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => save()}
          className="rounded-lg bg-accent px-3 py-1.5 font-medium text-white"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-3 py-1.5"
        >
          Cancelar
        </button>
        {initial && (
          <button
            type="button"
            onClick={() => save("")}
            className="rounded-lg px-3 py-1.5 text-danger hover:bg-surface-2"
          >
            Borrar
          </button>
        )}
        <span className="ml-auto text-xs text-muted tabular-nums">
          {text.length}/{NOTE_MAX}
        </span>
      </div>
    </div>
  );
}
