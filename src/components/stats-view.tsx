"use client";

import { useMemo } from "react";
import { addDays, startOfWeek, todayKey } from "@/lib/dates";
import {
  bestStreak,
  completionRate,
  countInWindow,
  currentStreak,
  describeFrequency,
  getGlobalDays,
  getPeriods,
  streakUnit,
} from "@/lib/habits";
import { useHabits } from "@/lib/store";
import { ActivityHeatmap, Meter, WeeklyBars } from "./charts";
import { Card, EmptyState, Loading, StreakBadge } from "./ui";

const WINDOW_DAYS = 30;
const WEEKS_SHOWN = 12;

export function StatsView() {
  const { data } = useHabits();
  const today = todayKey();

  const stats = useMemo(() => {
    if (!data) return null;
    const active = data.habits.filter((h) => !h.archived);

    const perHabit = active.map((habit) => {
      const done = new Set(data.completions[habit.id] ?? []);
      const periods = getPeriods(habit, done, today);
      return {
        habit,
        current: currentStreak(periods),
        best: bestStreak(periods),
        rate: completionRate(habit, periods, today, WINDOW_DAYS),
        periods,
        total: done.size,
      };
    });

    const globalDays = getGlobalDays(data.habits, data.completions, today);

    // Cumplimiento global = períodos cumplidos / evaluables en la ventana.
    let done = 0;
    let total = 0;
    for (const { habit, periods } of perHabit) {
      const c = countInWindow(habit, periods, today, WINDOW_DAYS);
      done += c.done;
      total += c.total;
    }

    const counts = new Map<string, number>();
    for (const h of active) {
      for (const day of data.completions[h.id] ?? []) {
        counts.set(day, (counts.get(day) ?? 0) + 1);
      }
    }

    const thisWeek = startOfWeek(today);
    const weekly = Array.from({ length: WEEKS_SHOWN }, (_, i) => {
      const week = addDays(thisWeek, -(WEEKS_SHOWN - 1 - i) * 7);
      let value = 0;
      for (let d = 0; d < 7; d++) value += counts.get(addDays(week, d)) ?? 0;
      return { week, value };
    });

    return {
      perHabit,
      globalCurrent: currentStreak(globalDays),
      globalBest: bestStreak(globalDays),
      rate: total === 0 ? null : done / total,
      totalCheckins: perHabit.reduce((sum, h) => sum + h.total, 0),
      counts,
      weekly,
      maxPerDay: active.length,
    };
  }, [data, today]);

  if (!data || !stats) return <Loading />;
  if (stats.perHabit.length === 0) {
    return (
      <EmptyState
        title="Sin datos todavía"
        text="Cuando tengas hábitos y marques algunos días vas a ver tus estadísticas acá."
      />
    );
  }

  const tiles = [
    { label: "Racha general", value: stats.globalCurrent, unit: "días" },
    { label: "Mejor racha general", value: stats.globalBest, unit: "días" },
    {
      label: `Cumplimiento ${WINDOW_DAYS} días`,
      value: stats.rate === null ? "—" : `${Math.round(stats.rate * 100)}%`,
      unit: "de lo programado",
    },
    {
      label: "Check-ins totales",
      value: stats.totalCheckins,
      unit: "registros",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Estadísticas</h1>
        <p className="text-sm text-muted">
          Tu progreso con los hábitos activos.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <p className="text-xs text-muted">{t.label}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {t.value}
            </p>
            <p className="text-xs text-muted">{t.unit}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">Actividad</h2>
        <ActivityHeatmap
          counts={stats.counts}
          today={today}
          maxPerDay={stats.maxPerDay}
        />
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">Check-ins por semana</h2>
        <p className="mb-3 text-xs text-muted">Últimas {WEEKS_SHOWN} semanas</p>
        <WeeklyBars data={stats.weekly} />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Por hábito</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="pb-2 font-normal">Hábito</th>
              <th className="pb-2 font-normal">Racha</th>
              <th className="hidden pb-2 font-normal sm:table-cell">Mejor</th>
              <th className="pb-2 font-normal">{WINDOW_DAYS} días</th>
              <th className="hidden pb-2 text-right font-normal sm:table-cell">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {stats.perHabit.map(({ habit, current, best, rate, total }) => (
              <tr key={habit.id} className="border-t border-border">
                <td className="py-2.5 pr-3">
                  <span className="mr-2" aria-hidden>
                    {habit.emoji}
                  </span>
                  <span className="font-medium">{habit.name}</span>
                  <span className="block pl-7 text-xs text-muted">
                    {describeFrequency(habit.frequency)}
                  </span>
                </td>
                <td className="py-2.5 pr-3">
                  <StreakBadge value={current} unit={streakUnit(habit)} />
                </td>
                <td className="hidden py-2.5 pr-3 tabular-nums sm:table-cell">
                  {best} {streakUnit(habit)}
                </td>
                <td className="py-2.5 pr-3">
                  <Meter value={rate} />
                </td>
                <td className="hidden py-2.5 text-right tabular-nums sm:table-cell">
                  {total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
