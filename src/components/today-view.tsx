"use client";

import { useMemo, useState, type ReactNode } from "react";
import { addDays, formatLong, startOfWeek, todayKey } from "@/lib/dates";
import {
  appliesOn,
  bestStreak,
  currentStreak,
  describeFrequency,
  doneDays,
  getGlobalDays,
  getPeriods,
  isDone,
  reorderSubset,
  streakUnit,
  weekCount,
} from "@/lib/habits";
import { useHabits, type HabitActions } from "@/lib/store";
import type { Entry, Habit } from "@/lib/types";
import { HabitForm } from "./habit-form";
import { NoteButton, NoteEditor, NotePreview } from "./note-editor";
import { SortableList } from "./sortable-list";
import { Card, EmptyState, Loading, StreakBadge } from "./ui";
import { TargetProgress, ValueStepper } from "./value-stepper";

export function TodayView() {
  const { data, actions } = useHabits();
  const today = todayKey();
  const [day, setDay] = useState(today);
  const [adding, setAdding] = useState(false);

  const global = useMemo(() => {
    if (!data) return null;
    const days = getGlobalDays(data.habits, data.completions, today);
    return { current: currentStreak(days), best: bestStreak(days) };
  }, [data, today]);

  if (!data || !global) return <Loading />;

  const habits = data.habits.filter((h) => !h.archived && h.createdAt <= day);
  const newHabit = adding && (
    <Card>
      <h2 className="mb-4 font-semibold">Nuevo hábito</h2>
      <HabitForm
        autoFocus
        submitLabel="Crear hábito"
        onSubmit={(input) => {
          actions.addHabit(input);
          setAdding(false);
        }}
        onCancel={() => setAdding(false)}
      />
    </Card>
  );

  if (data.habits.filter((h) => !h.archived).length === 0) {
    return (
      newHabit || (
        <EmptyState
          title="Todavía no tenés hábitos"
          text="Creá tu primer hábito y empezá a construir tu racha."
          action={
            <button
              onClick={() => setAdding(true)}
              className="mt-4 rounded-sm bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
            >
              Crear un hábito
            </button>
          }
        />
      )
    );
  }

  // Reordenar una de las dos listas mueve esos hábitos dentro del orden total.
  const reorder = (ids: string[]) =>
    actions.reorderHabits(
      reorderSubset(
        data.habits.map((h) => h.id),
        ids,
      ),
    );
  const label = (h: Habit) => h.name;

  const dueToday = habits.filter((h) => appliesOn(h, day));
  const notToday = habits.filter((h) => !dueToday.includes(h));
  const doneCount = dueToday.filter((h) =>
    isDone(h, data.completions[h.id]?.[day]),
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setDay(addDays(day, -1))}
          className="rounded-sm border border-border bg-surface px-3 py-1.5 text-sm hover:bg-surface-2"
          aria-label="Día anterior"
        >
          ←
        </button>
        <div className="text-center">
          <h1 className="text-xl font-semibold">
            {day === today ? "Hoy" : formatLong(day)}
          </h1>
          <p className="text-sm text-muted">
            {day === today ? formatLong(day) : "Editando un día pasado"}
          </p>
        </div>
        <button
          onClick={() => setDay(addDays(day, 1))}
          disabled={day >= today}
          className="rounded-sm border border-border bg-surface px-3 py-1.5 text-sm hover:bg-surface-2 disabled:opacity-30"
          aria-label="Día siguiente"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
            Racha general
          </p>
          <p className="mt-1 text-3xl font-semibold font-mono tabular-nums">
            <span className={global.current > 0 ? "text-streak" : ""}>
              {global.current}
            </span>
          </p>
          <p className="text-xs text-muted">días</p>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
            Mejor racha
          </p>
          <p className="mt-1 text-3xl font-semibold font-mono tabular-nums">
            {global.best}
          </p>
          <p className="text-xs text-muted">días</p>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
            Completados
          </p>
          <p className="mt-1 text-3xl font-semibold font-mono tabular-nums">
            {doneCount}
            <span className="text-lg text-muted">/{dueToday.length}</span>
          </p>
          <p className="text-xs text-muted">
            {day === today ? "hoy" : "ese día"}
          </p>
        </Card>
      </div>

      <div className="space-y-2">
        <SortableList
          items={dueToday}
          getLabel={label}
          onReorder={reorder}
          className="space-y-2"
          renderItem={(h, handle) => (
            <HabitRow
              actions={actions}
              habit={h}
              day={day}
              today={today}
              done={doneDays(h, data.completions[h.id])}
              entry={data.completions[h.id]?.[day]}
              handle={handle}
            />
          )}
        />
        {newHabit || (
          <button
            onClick={() => setAdding(true)}
            className="flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-border p-3 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <span aria-hidden className="text-lg leading-none">
              +
            </span>
            Nuevo hábito
          </button>
        )}
      </div>

      {notToday.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted">
            No toca este día
          </h2>
          <SortableList
            items={notToday}
            getLabel={label}
            onReorder={reorder}
            className="space-y-2 opacity-60"
            renderItem={(h, handle) => (
              <HabitRow
                actions={actions}
                habit={h}
                day={day}
                today={today}
                done={doneDays(h, data.completions[h.id])}
                entry={data.completions[h.id]?.[day]}
                handle={handle}
                disabled
              />
            )}
          />
        </div>
      )}

      <p className="text-xs text-muted">
        La racha general cuenta los días seguidos en que completaste todos los
        hábitos con días fijos. Los hábitos de “N veces por semana” tienen su
        propia racha en semanas.
      </p>
    </div>
  );
}

function HabitRow({
  actions,
  habit,
  day,
  today,
  done,
  entry,
  handle,
  disabled = false,
}: {
  actions: HabitActions;
  habit: Habit;
  day: string;
  today: string;
  /** Fechas en que el hábito quedó completado. */
  done: Set<string>;
  /** Registro de ese día (cantidad y nota). */
  entry: Entry | undefined;
  /** Manija para reordenar arrastrando. */
  handle: ReactNode;
  disabled?: boolean;
}) {
  const checked = done.has(day);
  const streak = currentStreak(getPeriods(habit, done, today));
  const measurable = habit.target != null;
  const value = entry?.value ?? 0;
  const note = entry?.note ?? "";
  // Se guarda el día: si se cambia de día con la nota abierta, se cierra.
  const [noteDay, setNoteDay] = useState<string | null>(null);
  const editingNote = noteDay === day;

  const content = (
    <>
      <span className="text-2xl" aria-hidden>
        {habit.emoji}
      </span>
      <span className="min-w-0 flex-1 basis-32">
        <span className="block truncate font-medium">{habit.name}</span>
        <span className="block text-xs text-muted">
          {describeFrequency(habit.frequency)}
          {habit.frequency.type === "timesPerWeek" &&
            ` · ${weekCount(done, day)}/${habit.frequency.count} ${startOfWeek(day) === startOfWeek(today) ? "esta semana" : "esa semana"}`}
        </span>
        {measurable && <TargetProgress habit={habit} value={value} />}
        {note && !editingNote && <NotePreview note={note} />}
      </span>
      <StreakBadge value={streak} unit={streakUnit(habit)} />
    </>
  );

  return (
    <div
      className={`rounded-lg border transition-colors ${
        checked
          ? "border-success/40 bg-success-soft/30"
          : measurable
            ? "border-border bg-surface"
            : "border-border bg-surface has-[button:enabled:hover]:bg-surface-2"
      }`}
    >
      <div className="flex items-stretch pl-1.5">
        {handle}
        {measurable ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2 py-3 pr-2 pl-1.5 sm:py-4">
            {content}
            <ValueStepper
              habit={habit}
              value={value}
              disabled={disabled}
              onChange={(n) => actions.setValue(habit.id, day, n)}
            />
          </div>
        ) : (
          <button
            onClick={() => actions.toggleCompletion(habit.id, day, checked)}
            disabled={disabled}
            aria-pressed={checked}
            className="flex min-w-0 flex-1 items-center gap-3 py-3 pr-2 pl-1.5 text-left disabled:cursor-not-allowed sm:py-4"
          >
            {content}
            <span
              aria-hidden
              className={`flex size-6 shrink-0 items-center justify-center rounded-sm border-2 text-sm font-bold ${
                checked
                  ? "border-success bg-success text-success-foreground"
                  : "border-muted/50"
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
          disabled={disabled}
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
    </div>
  );
}
