"use client";

import { useState } from "react";
import { formatLong } from "@/lib/dates";
import type { DayNote } from "@/lib/habits";
import { Card } from "./ui";

const PAGE_SIZE = 10;

/**
 * Notas más recientes, con filtro por hábito. Tocar la fecha abre ese día en
 * el heatmap para editarlo.
 */
export function RecentNotes({
  notes,
  onSelectDay,
}: {
  notes: DayNote[];
  onSelectDay: (day: string) => void;
}) {
  const [habitId, setHabitId] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE_SIZE);
  if (notes.length === 0) return null;

  // Hábitos con notas, en el orden en que aparecen sus notas más recientes.
  const habits = [...new Map(notes.map((n) => [n.habit.id, n.habit])).values()];
  const filtered = habitId
    ? notes.filter((n) => n.habit.id === habitId)
    : notes;

  function filter(id: string | null) {
    setHabitId(id);
    setShown(PAGE_SIZE);
  }

  const chip = (active: boolean) =>
    `rounded-sm border px-2.5 py-1 text-xs ${
      active
        ? "border-accent bg-accent-soft/40"
        : "border-border text-muted hover:text-foreground"
    }`;

  return (
    <Card>
      <h2 className="mb-3 font-semibold">Notas recientes</h2>
      {habits.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => filter(null)}
            aria-pressed={habitId === null}
            className={chip(habitId === null)}
          >
            Todas
          </button>
          {habits.map((h) => (
            <button
              type="button"
              key={h.id}
              onClick={() => filter(h.id)}
              aria-pressed={habitId === h.id}
              className={chip(habitId === h.id)}
            >
              <span aria-hidden>{h.emoji}</span> {h.name}
            </button>
          ))}
        </div>
      )}
      <ul className="space-y-3">
        {filtered.slice(0, shown).map((n) => (
          <li key={`${n.habit.id}-${n.day}`} className="text-sm">
            <p className="text-xs text-muted">
              <button
                type="button"
                onClick={() => onSelectDay(n.day)}
                className="underline-offset-2 hover:text-foreground hover:underline"
              >
                {formatLong(n.day)}
              </button>
              {" · "}
              <span aria-hidden>{n.habit.emoji}</span> {n.habit.name}
            </p>
            <p className="mt-0.5 whitespace-pre-line break-words">{n.note}</p>
          </li>
        ))}
      </ul>
      {filtered.length > shown && (
        <button
          type="button"
          onClick={() => setShown((s) => s + PAGE_SIZE)}
          className="mt-3 text-sm text-accent hover:underline"
        >
          Ver más ({filtered.length - shown})
        </button>
      )}
    </Card>
  );
}
