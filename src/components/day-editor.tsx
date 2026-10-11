"use client";

import { useState } from "react";
import { formatLong } from "@/lib/dates";
import { appliesOn, describeFrequency, isDone } from "@/lib/habits";
import type { HabitActions } from "@/lib/store";
import type { Entry, Habit, HabitData } from "@/lib/types";
import { NoteButton, NoteEditor, NotePreview } from "./note-editor";
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
        {habits.map((h) => (
          <DayHabitRow
            key={h.id}
            habit={h}
            day={day}
            entry={data.completions[h.id]?.[day]}
            actions={actions}
          />
        ))}
      </ul>
    </div>
  );
}

function DayHabitRow({
  habit,
  day,
  entry,
  actions,
}: {
  habit: Habit;
  day: string;
  entry: Entry | undefined;
  actions: HabitActions;
}) {
  const checked = isDone(habit, entry);
  const note = entry?.note ?? "";
  // Se guarda el día: si se elige otro día con la nota abierta, se cierra.
  const [noteDay, setNoteDay] = useState<string | null>(null);
  const editingNote = noteDay === day;

  const info = (
    <>
      <span className="text-xl" aria-hidden>
        {habit.emoji}
      </span>
      <span className="min-w-0 flex-1 basis-32">
        <span className="block truncate text-sm font-medium">{habit.name}</span>
        <span className="block text-xs text-muted">
          {describeFrequency(habit.frequency)}
        </span>
        {habit.target != null && (
          <TargetProgress habit={habit} value={entry?.value ?? 0} />
        )}
        {note && !editingNote && <NotePreview note={note} />}
      </span>
    </>
  );
  const main = "flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left";

  return (
    <li
      className={`rounded-lg border transition-colors ${
        checked ? "border-accent bg-accent-soft/40" : "border-border"
      }`}
    >
      <div className="flex items-stretch">
        {habit.target != null ? (
          <div className={`${main} flex-wrap gap-y-2`}>
            {info}
            <ValueStepper
              habit={habit}
              value={entry?.value ?? 0}
              onChange={(n) => actions.setValue(habit.id, day, n)}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => actions.toggleCompletion(habit.id, day, checked)}
            aria-pressed={checked}
            className={`${main} rounded-l-lg ${checked ? "" : "hover:bg-surface-2"}`}
          >
            {info}
            <span
              aria-hidden
              className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-xs ${
                checked ? "border-accent bg-accent text-white" : "border-border"
              }`}
            >
              {checked && "✓"}
            </span>
          </button>
        )}
        <NoteButton
          hasNote={note !== ""}
          open={editingNote}
          habitName={habit.name}
          rounded="rounded-r-lg"
          onClick={() => setNoteDay(editingNote ? null : day)}
        />
      </div>
      {editingNote && (
        <NoteEditor
          initial={note}
          onSave={(text) => actions.setNote(habit.id, day, text)}
          onClose={() => setNoteDay(null)}
        />
      )}
    </li>
  );
}
