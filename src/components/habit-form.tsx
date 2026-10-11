"use client";

import { useState, type FormEvent } from "react";
import { WEEKDAY_NAMES, WEEKDAY_SHORT } from "@/lib/dates";
import type { HabitInput } from "@/lib/store";
import type { Frequency, Weekday } from "@/lib/types";

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Ejercicio",
    emojis: [
      "💪",
      "🏃",
      "🚶",
      "🚴",
      "🏊",
      "🏋️",
      "🤸",
      "🧗",
      "⚽",
      "🎾",
      "🥾",
      "🧘",
    ],
  },
  {
    label: "Alimentación y salud",
    emojis: [
      "💧",
      "🥗",
      "🍎",
      "🥦",
      "🍳",
      "🥛",
      "🍵",
      "☕",
      "🚭",
      "💊",
      "🦷",
      "🩺",
    ],
  },
  {
    label: "Descanso y bienestar",
    emojis: [
      "😴",
      "🛏️",
      "🚿",
      "🧴",
      "🌞",
      "🌙",
      "🙏",
      "😊",
      "❤️",
      "🛀",
      "📵",
      "🌳",
    ],
  },
  {
    label: "Mente y estudio",
    emojis: [
      "📚",
      "✍️",
      "📝",
      "🧠",
      "🎓",
      "💻",
      "🗣️",
      "🌍",
      "🧩",
      "🎯",
      "📰",
      "⏰",
    ],
  },
  {
    label: "Hogar y finanzas",
    emojis: [
      "🧹",
      "🧺",
      "🍽️",
      "🌱",
      "🐶",
      "🐱",
      "💰",
      "🛒",
      "📅",
      "♻️",
      "🔧",
      "📦",
    ],
  },
  {
    label: "Hobbies y vínculos",
    emojis: [
      "🎸",
      "🎹",
      "🎨",
      "📷",
      "🎬",
      "🎮",
      "🧶",
      "📞",
      "🤝",
      "💌",
      "✈️",
      "⭐",
    ],
  },
];
const DEFAULT_EMOJI = EMOJI_GROUPS[0].emojis[0];
const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

type Mode = Frequency["type"];

export function HabitForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  autoFocus = false,
}: {
  initial?: HabitInput;
  submitLabel: string;
  onSubmit: (input: HabitInput) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? DEFAULT_EMOJI);
  const [mode, setMode] = useState<Mode>(initial?.frequency.type ?? "daily");
  const [days, setDays] = useState<Weekday[]>(
    initial?.frequency.type === "weekdays" ? initial.frequency.days : [0, 2, 4],
  );
  const [count, setCount] = useState(
    initial?.frequency.type === "timesPerWeek" ? initial.frequency.count : 3,
  );

  const [measurable, setMeasurable] = useState(initial?.target != null);
  const [target, setTarget] = useState(String(initial?.target ?? 8));
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const targetValue = Number(target);

  const valid =
    name.trim() !== "" &&
    (mode !== "weekdays" || days.length > 0) &&
    (!measurable || (Number.isFinite(targetValue) && targetValue > 0));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const frequency: Frequency =
      mode === "daily"
        ? { type: "daily" }
        : mode === "weekdays"
          ? { type: "weekdays", days: [...days].sort() }
          : { type: "timesPerWeek", count };
    // `target` y `unit` van siempre, aunque sea `undefined`, para que al
    // editar se pueda quitar la meta.
    onSubmit({
      name: name.trim(),
      emoji,
      frequency,
      target: measurable ? targetValue : undefined,
      unit: measurable ? unit.trim() || undefined : undefined,
    });
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
          autoFocus={autoFocus}
          maxLength={60}
          className="w-full rounded-sm border border-border bg-background px-3 py-2 outline-none focus:border-accent"
        />
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">
          Ícono{" "}
          <span className="ml-1 text-xl" aria-hidden>
            {emoji}
          </span>
        </legend>
        <div className="max-h-64 space-y-3 overflow-y-auto rounded-sm border border-border p-2">
          {EMOJI_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1 text-xs text-muted">{group.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.emojis.map((e) => (
                  <button
                    type="button"
                    key={e}
                    onClick={() => setEmoji(e)}
                    aria-pressed={emoji === e}
                    className={`size-10 rounded-sm border text-xl ${
                      emoji === e
                        ? "border-accent bg-accent-soft/40"
                        : "border-transparent hover:bg-surface-2"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
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
              className={`flex cursor-pointer items-center gap-2 rounded-sm border px-3 py-2 text-sm ${
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
                className={`size-10 rounded-sm border font-mono text-sm font-medium ${
                  days.includes(d)
                    ? "border-accent bg-accent text-accent-foreground"
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
            <span className="w-28 font-mono tabular-nums">
              {count} {count === 1 ? "vez" : "veces"} / semana
            </span>
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">Registro</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              [false, "Sí / no", "Lo hice o no lo hice"],
              [true, "Medible", "Con una meta, ej. 8 vasos"],
            ] as const
          ).map(([value, label, hint]) => (
            <label
              key={label}
              className={`flex cursor-pointer items-center gap-2 rounded-sm border px-3 py-2 text-sm ${
                measurable === value
                  ? "border-accent bg-accent-soft/40"
                  : "border-border"
              }`}
            >
              <input
                type="radio"
                name="kind"
                checked={measurable === value}
                onChange={() => setMeasurable(value)}
                className="accent-accent"
              />
              <span>
                {label}
                <span className="block text-xs text-muted">{hint}</span>
              </span>
            </label>
          ))}
        </div>

        {measurable && (
          <div className="mt-3 flex gap-2">
            <div className="w-28">
              <label
                htmlFor="habit-target"
                className="mb-1 block text-xs text-muted"
              >
                Meta por día
              </label>
              <input
                id="habit-target"
                type="number"
                inputMode="decimal"
                min={0.1}
                step="any"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full rounded-sm border border-border bg-background px-3 py-2 font-mono tabular-nums outline-none focus:border-accent"
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="habit-unit"
                className="mb-1 block text-xs text-muted"
              >
                Unidad (opcional)
              </label>
              <input
                id="habit-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Ej: vasos, min, páginas"
                maxLength={20}
                className="w-full rounded-sm border border-border bg-background px-3 py-2 outline-none focus:border-accent"
              />
            </div>
          </div>
        )}
      </fieldset>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!valid}
          className="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-40"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-sm border border-border px-4 py-2 text-sm"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
