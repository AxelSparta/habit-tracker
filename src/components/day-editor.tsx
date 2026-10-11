"use client";

import { formatLong } from "@/lib/dates";
import { appliesOn, describeFrequency } from "@/lib/habits";
import type { HabitActions } from "@/lib/store";
import type { HabitData } from "@/lib/types";

/** Lista los hábitos activos que aplicaban en `day` para marcarlos o desmarcarlos. */
export function DayEditor({
  data,
  actions,
  day,
  today,
  onClose,
}: {
  data: HabitData;
  actions: HabitActions;
  day: string;
  today: string;
  onClose: () => void;
}) {
  const habits = data.habits.filter((h) => !h.archived && appliesOn(h, day));
  const doneCount = habits.filter((h) =>
    data.completions[h.id]?.includes(day),
  ).length;

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">
            {day === today ? "Hoy" : formatLong(day)}
          </h3>
          <p className="text-xs text-muted">
            {habits.length === 0
              ? "No había hábitos para marcar ese día."
              : `${doneCount} de ${habits.length} completados`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-surface-2 hover:text-foreground"
          aria-label="Cerrar el día"
        >
          ✕
        </button>
      </div>
      <ul className="space-y-2">
        {habits.map((h) => {
          const checked = data.completions[h.id]?.includes(day) ?? false;
          return (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => actions.toggleCompletion(h.id, day, checked)}
                aria-pressed={checked}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                  checked
                    ? "border-accent bg-accent-soft/40"
                    : "border-border hover:bg-surface-2"
                }`}
              >
                <span className="text-xl" aria-hidden>
                  {h.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {h.name}
                  </span>
                  <span className="block text-xs text-muted">
                    {describeFrequency(h.frequency)}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-xs ${
                    checked
                      ? "border-accent bg-accent text-white"
                      : "border-border"
                  }`}
                >
                  {checked && "✓"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
