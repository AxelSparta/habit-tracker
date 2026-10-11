"use client";

import { useState } from "react";
import { describeTarget, formatAmount } from "@/lib/habits";
import type { Habit } from "@/lib/types";

/**
 * Contador de un hábito medible: − / + de a uno, o escribir la cantidad
 * (se guarda al salir del campo o con Enter).
 */
export function ValueStepper({
  habit,
  value,
  onChange,
  disabled = false,
}: {
  habit: Habit;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  // Texto mientras se edita a mano; `null` = mostrar el valor guardado.
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    if (draft === null) return;
    const n = Number(draft.replace(",", "."));
    if (Number.isFinite(n) && n >= 0 && n !== value) onChange(n);
    setDraft(null);
  }

  const button =
    "flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-lg leading-none hover:bg-surface-2 disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={disabled || value <= 0}
        aria-label={`Restar uno a ${habit.name}`}
        className={button}
      >
        −
      </button>
      <input
        type="text"
        inputMode="decimal"
        value={draft ?? formatAmount(value)}
        onFocus={(e) => {
          setDraft(String(value));
          e.currentTarget.select();
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(null);
            e.currentTarget.blur();
          }
        }}
        disabled={disabled}
        aria-label={`Cantidad de ${habit.name}, meta ${describeTarget(habit)}`}
        className="w-12 rounded-md border border-transparent bg-transparent py-1 text-center font-medium tabular-nums outline-none hover:border-border focus:border-accent disabled:hover:border-transparent"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={disabled}
        aria-label={`Sumar uno a ${habit.name}`}
        className={button}
      >
        +
      </button>
    </div>
  );
}

/** Barra de progreso hacia la meta (0–100 %). */
export function TargetProgress({
  habit,
  value,
}: {
  habit: Habit;
  value: number;
}) {
  const ratio = habit.target ? Math.min(1, value / habit.target) : 0;
  return (
    <span className="mt-1 flex items-center gap-2 text-xs text-muted">
      <span className="h-1.5 w-full max-w-32 overflow-hidden rounded-full bg-surface-2">
        <span
          className="block h-full rounded-full bg-accent transition-[width]"
          style={{ width: `${ratio * 100}%` }}
        />
      </span>
      <span className="whitespace-nowrap tabular-nums">
        {formatAmount(value)} / {describeTarget(habit)}
      </span>
    </span>
  );
}
