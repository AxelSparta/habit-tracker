"use client";

import { addDays, startOfMonth, startOfWeek } from "@/lib/dates";
import {
  averageValue,
  describeTarget,
  formatQuantity,
  sumValues,
} from "@/lib/habits";
import type { HabitData } from "@/lib/types";
import { WeeklyBars } from "./charts";
import { Card } from "./ui";

const WINDOW_DAYS = 30;
const WEEKS_SHOWN = 12;

/**
 * Totales de cada hábito medible activo: esta semana, este mes, desde que
 * existe y promedio diario, más un gráfico con el total de cada semana.
 */
export function MeasurableStats({
  data,
  today,
}: {
  data: HabitData;
  today: string;
}) {
  const habits = data.habits.filter((h) => !h.archived && h.target != null);
  if (habits.length === 0) return null;

  const thisWeek = startOfWeek(today);
  const weeks = Array.from({ length: WEEKS_SHOWN }, (_, i) =>
    addDays(thisWeek, -(WEEKS_SHOWN - 1 - i) * 7),
  );

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">Hábitos medibles</h2>
      {habits.map((habit) => {
        const entries = data.completions[habit.id];
        const average = averageValue(habit, entries, today, WINDOW_DAYS);
        const format = (n: number) => formatQuantity(habit, n);
        const tiles = [
          {
            label: "Esta semana",
            value: sumValues(entries, thisWeek, today),
          },
          {
            label: "Este mes",
            value: sumValues(entries, startOfMonth(today), today),
          },
          { label: "Total", value: sumValues(entries) },
        ];
        const weekly = weeks.map((week) => ({
          week,
          value: sumValues(entries, week, addDays(week, 6)),
        }));

        return (
          <Card key={habit.id}>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h3 className="min-w-0 truncate font-medium">
                <span className="mr-2" aria-hidden>
                  {habit.emoji}
                </span>
                {habit.name}
              </h3>
              <p className="shrink-0 text-xs text-muted">
                Meta {describeTarget(habit)} por día
              </p>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {tiles.map((t) => (
                <div key={t.label}>
                  <p className="text-xs text-muted">{t.label}</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {format(t.value)}
                  </p>
                </div>
              ))}
              <div>
                <p className="text-xs text-muted">
                  Promedio ({WINDOW_DAYS} días)
                </p>
                <p className="text-lg font-semibold tabular-nums">
                  {average === null ? "—" : format(average)}
                  <span className="text-xs font-normal text-muted"> / día</span>
                </p>
              </div>
            </div>

            <p className="mb-2 text-xs text-muted">
              Total por semana · últimas {WEEKS_SHOWN} semanas
            </p>
            <WeeklyBars
              data={weekly}
              label={`${habit.name}: total por semana`}
              format={format}
            />
          </Card>
        );
      })}
    </section>
  );
}
