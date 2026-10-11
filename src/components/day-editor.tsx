"use client";

import { formatLong } from "@/lib/dates";
import { appliesOn, describeFrequency, isDone } from "@/lib/habits";
import type { HabitActions } from "@/lib/store";
import type { HabitData } from "@/lib/types";
import { TargetProgress, ValueStepper } from "./value-stepper";

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
    isDone(h, data.completions[h.id]?.[day]),
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
          const entry = data.completions[h.id]?.[day];
          const checked = isDone(h, entry);
          const info = (
            <>
              <span className="text-xl" aria-hidden>
                {h.emoji}
              </span>
              <span className="min-w-0 flex-1 basis-32">
                <span className="block truncate text-sm font-medium">
                  {h.name}
                </span>
                <span className="block text-xs text-muted">
                  {describeFrequency(h.frequency)}
                </span>
                {h.target != null && (
                  <TargetProgress habit={h} value={entry?.value ?? 0} />
                )}
              </span>
            </>
          );
          const box = `flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
            checked ? "border-accent bg-accent-soft/40" : "border-border"
          }`;
          return (
            <li key={h.id}>
              {h.target != null ? (
                <div className={`${box} flex-wrap gap-y-2`}>
                  {info}
                  <ValueStepper
                    habit={h}
                    value={entry?.value ?? 0}
                    onChange={(n) => actions.setValue(h.id, day, n)}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => actions.toggleCompletion(h.id, day, checked)}
                  aria-pressed={checked}
                  className={`${box} ${checked ? "" : "hover:bg-surface-2"}`}
                >
                  {info}
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
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
