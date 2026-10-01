"use client";

import { useMemo, useState } from "react";
import { addDays, formatLong, startOfWeek, todayKey } from "@/lib/dates";
import {
  bestStreak,
  currentStreak,
  describeFrequency,
  getGlobalDays,
  getPeriods,
  isScheduledOn,
  streakUnit,
  weekCount,
} from "@/lib/habits";
import { useHabits, type HabitActions } from "@/lib/store";
import type { Habit } from "@/lib/types";
import { Card, EmptyState, Loading, StreakBadge } from "./ui";

export function TodayView() {
  const { data, actions } = useHabits();
  const today = todayKey();
  const [day, setDay] = useState(today);

  const global = useMemo(() => {
    if (!data) return null;
    const days = getGlobalDays(data.habits, data.completions, today);
    return { current: currentStreak(days), best: bestStreak(days) };
  }, [data, today]);

  if (!data || !global) return <Loading />;

  const habits = data.habits.filter((h) => !h.archived && h.createdAt <= day);
  if (data.habits.filter((h) => !h.archived).length === 0) {
    return (
      <EmptyState
        title="Todavía no tenés hábitos"
        text="Creá tu primer hábito y empezá a construir tu racha."
      />
    );
  }

  const dueToday = habits.filter(
    (h) => h.frequency.type === "timesPerWeek" || isScheduledOn(h, day),
  );
  const notToday = habits.filter((h) => !dueToday.includes(h));
  const doneCount = dueToday.filter((h) =>
    data.completions[h.id]?.includes(day),
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setDay(addDays(day, -1))}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm hover:bg-surface-2"
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
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm hover:bg-surface-2 disabled:opacity-30"
          aria-label="Día siguiente"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <p className="text-xs text-muted">Racha general</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">
            {global.current > 0 && <span aria-hidden>🔥</span>}
            {global.current}
          </p>
          <p className="text-xs text-muted">días</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Mejor racha</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">
            {global.best}
          </p>
          <p className="text-xs text-muted">días</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Completados</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">
            {doneCount}
            <span className="text-lg text-muted">/{dueToday.length}</span>
          </p>
          <p className="text-xs text-muted">
            {day === today ? "hoy" : "ese día"}
          </p>
        </Card>
      </div>

      <ul className="space-y-2">
        {dueToday.map((h) => (
          <HabitRow
            key={h.id}
            actions={actions}
            habit={h}
            day={day}
            today={today}
            done={data.completions[h.id] ?? []}
          />
        ))}
      </ul>

      {notToday.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted">
            No toca este día
          </h2>
          <ul className="space-y-2 opacity-60">
            {notToday.map((h) => (
              <HabitRow
                key={h.id}
                actions={actions}
                habit={h}
                day={day}
                today={today}
                done={data.completions[h.id] ?? []}
                disabled
              />
            ))}
          </ul>
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
  disabled = false,
}: {
  actions: HabitActions;
  habit: Habit;
  day: string;
  today: string;
  done: string[];
  disabled?: boolean;
}) {
  const set = new Set(done);
  const checked = set.has(day);
  const streak = currentStreak(getPeriods(habit, set, today));

  return (
    <li>
      <button
        onClick={() => actions.toggleCompletion(habit.id, day, checked)}
        disabled={disabled}
        aria-pressed={checked}
        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors sm:p-4 ${
          checked
            ? "border-accent bg-accent-soft/40"
            : "border-border bg-surface hover:bg-surface-2"
        } disabled:cursor-not-allowed`}
      >
        <span className="text-2xl" aria-hidden>
          {habit.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{habit.name}</span>
          <span className="block text-xs text-muted">
            {describeFrequency(habit.frequency)}
            {habit.frequency.type === "timesPerWeek" &&
              ` · ${weekCount(set, day)}/${habit.frequency.count} ${startOfWeek(day) === startOfWeek(today) ? "esta semana" : "esa semana"}`}
          </span>
        </span>
        <StreakBadge value={streak} unit={streakUnit(habit)} />
        <span
          aria-hidden
          className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-sm ${
            checked ? "border-accent bg-accent text-white" : "border-border"
          }`}
        >
          {checked && "✓"}
        </span>
      </button>
    </li>
  );
}
