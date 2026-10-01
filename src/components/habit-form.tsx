"use client";

import { useState, type FormEvent } from "react";
import { WEEKDAY_NAMES, WEEKDAY_SHORT } from "@/lib/dates";
import type { HabitInput } from "@/lib/store";
import type { Frequency, Weekday } from "@/lib/types";

const EMOJIS = [
  "💪",
  "📚",
  "🧘",
  "🏃",
  "💧",
  "🥗",
  "😴",
  "✍️",
  "🎸",
  "🧹",
  "💊",
  "🌱",
];
const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

type Mode = Frequency["type"];

export function HabitForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: HabitInput;
  submitLabel: string;
  onSubmit: (input: HabitInput) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? EMOJIS[0]);
  const [mode, setMode] = useState<Mode>(initial?.frequency.type ?? "daily");
  const [days, setDays] = useState<Weekday[]>(
    initial?.frequency.type === "weekdays" ? initial.frequency.days : [0, 2, 4],
  );
  const [count, setCount] = useState(
    initial?.frequency.type === "timesPerWeek" ? initial.frequency.count : 3,
  );

  const valid = name.trim() !== "" && (mode !== "weekdays" || days.length > 0);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const frequency: Frequency =
      mode === "daily"
        ? { type: "daily" }
        : mode === "weekdays"
          ? { type: "weekdays", days: [...days].sort() }
          : { type: "timesPerWeek", count };
    onSubmit({ name: name.trim(), emoji, frequency });
    if (!initial) setName("");
  }

  function toggleDay(d: Weekday) {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="habit-name" className="mb-1 block text-sm font-medium">
          Nombre
        </label>
        <input
          id="habit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Leer 20 minutos"
          maxLength={60}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
        />
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">Ícono</legend>
        <div className="flex flex-wrap gap-1.5">
          {EMOJIS.map((e) => (
            <button
              type="button"
              key={e}
              onClick={() => setEmoji(e)}
              aria-pressed={emoji === e}
              className={`size-10 rounded-lg border text-xl ${
                emoji === e
                  ? "border-accent bg-accent-soft/40"
                  : "border-border"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">Frecuencia</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              ["daily", "Todos los días"],
              ["weekdays", "Días específicos"],
              ["timesPerWeek", "Veces por semana"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                mode === value
                  ? "border-accent bg-accent-soft/40"
                  : "border-border"
              }`}
            >
              <input
                type="radio"
                name="mode"
                value={value}
                checked={mode === value}
                onChange={() => setMode(value)}
                className="accent-accent"
              />
              {label}
            </label>
          ))}
        </div>

        {mode === "weekdays" && (
          <div className="mt-3 flex gap-1.5">
            {ALL_DAYS.map((d) => (
              <button
                type="button"
                key={d}
                onClick={() => toggleDay(d)}
                aria-pressed={days.includes(d)}
                aria-label={WEEKDAY_NAMES[d]}
                className={`size-10 rounded-full border text-sm font-medium ${
                  days.includes(d)
                    ? "border-accent bg-accent text-white"
                    : "border-border text-muted"
                }`}
              >
                {WEEKDAY_SHORT[d]}
              </button>
            ))}
          </div>
        )}

        {mode === "timesPerWeek" && (
          <div className="mt-3 flex items-center gap-3 text-sm">
            <input
              type="range"
              min={1}
              max={6}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="flex-1 accent-accent"
              aria-label="Veces por semana"
            />
            <span className="w-28 tabular-nums">
              {count} {count === 1 ? "vez" : "veces"} / semana
            </span>
          </div>
        )}
      </fieldset>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!valid}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
