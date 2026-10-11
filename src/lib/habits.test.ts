import { describe, expect, it } from "vitest";
import {
  appliesOn,
  bestStreak,
  completionRate,
  currentStreak,
  doneDays,
  getGlobalDays,
  getPeriods,
  isDone,
  reorderSubset,
} from "./habits";
import type { Entry, Frequency, Habit } from "./types";

// 2026-09-28 es lunes.
const MON = "2026-09-28";

function habit(frequency: Frequency, createdAt = "2026-09-01"): Habit {
  return {
    id: "h",
    name: "Test",
    emoji: "✅",
    frequency,
    createdAt,
    archived: false,
    position: 0,
  };
}

/** Registros sí/no marcados en las fechas dadas. */
function entries(...days: string[]): Record<string, Entry> {
  return Object.fromEntries(days.map((d) => [d, {}]));
}

function streaks(h: Habit, done: string[], today: string) {
  const periods = getPeriods(h, new Set(done), today);
  return { current: currentStreak(periods), best: bestStreak(periods) };
}

describe("hábitos diarios", () => {
  const h = habit({ type: "daily" });

  it("cuenta días consecutivos incluyendo hoy", () => {
    expect(streaks(h, ["2026-09-26", "2026-09-27", MON], MON).current).toBe(3);
  });

  it("no corta la racha si hoy todavía no se completó", () => {
    expect(streaks(h, ["2026-09-26", "2026-09-27"], MON).current).toBe(2);
  });

  it("se corta si se saltea un día", () => {
    expect(streaks(h, ["2026-09-25", "2026-09-27"], MON).current).toBe(1);
  });

  it("calcula la mejor racha histórica", () => {
    const done = ["2026-09-10", "2026-09-11", "2026-09-12", "2026-09-20"];
    expect(streaks(h, done, MON).best).toBe(3);
  });
});

describe("hábitos de días específicos", () => {
  // Lunes, miércoles y viernes.
  const h = habit({ type: "weekdays", days: [0, 2, 4] });

  it("ignora los días no programados", () => {
    // mié 23, vie 25, lun 28
    expect(streaks(h, ["2026-09-23", "2026-09-25", MON], MON).current).toBe(3);
  });

  it("se corta si falta un día programado", () => {
    // falta el miércoles 23
    expect(streaks(h, ["2026-09-21", "2026-09-25"], "2026-09-27").current).toBe(
      1,
    );
  });
});

describe("hábitos N veces por semana", () => {
  const h = habit({ type: "timesPerWeek", count: 2 }, "2026-09-14");

  it("cuenta semanas cumplidas y deja pendiente la semana actual", () => {
    const done = ["2026-09-14", "2026-09-16", "2026-09-22", "2026-09-26"];
    expect(streaks(h, done, MON).current).toBe(2);
  });

  it("incluye la semana actual cuando ya se cumplió", () => {
    const done = ["2026-09-22", "2026-09-26", MON, "2026-09-29"];
    expect(streaks(h, done, "2026-09-29").current).toBe(2);
  });

  it("una semana incompleta corta la racha", () => {
    const done = ["2026-09-14", "2026-09-16", "2026-09-22"];
    expect(streaks(h, done, MON).current).toBe(0);
  });
});

describe("tasa de cumplimiento", () => {
  it("no cuenta el día de hoy pendiente", () => {
    const h = habit({ type: "daily" }, "2026-09-25");
    const periods = getPeriods(h, new Set(["2026-09-25", "2026-09-26"]), MON);
    // 25 ✓, 26 ✓, 27 ✗, 28 pendiente
    expect(completionRate(h, periods, MON, 30)).toBeCloseTo(2 / 3);
  });
});

describe("racha general", () => {
  it("requiere completar todos los hábitos con días fijos", () => {
    const a = { ...habit({ type: "daily" }, "2026-09-25"), id: "a" };
    const b = {
      ...habit({ type: "weekdays", days: [6] }, "2026-09-25"),
      id: "b",
    }; // domingo
    const weekly = {
      ...habit({ type: "timesPerWeek", count: 5 }, "2026-09-25"),
      id: "w",
    };
    const completions = {
      a: entries("2026-09-25", "2026-09-26", "2026-09-27"),
      b: entries("2026-09-27"),
    };
    const days = getGlobalDays([a, b, weekly], completions, MON);
    expect(currentStreak(days)).toBe(3);

    const missingSunday = getGlobalDays([a, b], { ...completions, b: {} }, MON);
    expect(currentStreak(missingSunday)).toBe(0);
  });

  it("un hábito medible sólo cuenta los días que llegó a la meta", () => {
    const a = { ...habit({ type: "daily" }, "2026-09-26"), id: "a" };
    const water = { ...a, id: "w", target: 8 };
    const completions = {
      a: entries("2026-09-26", "2026-09-27"),
      w: { "2026-09-26": { value: 8 }, "2026-09-27": { value: 5 } },
    };
    const days = getGlobalDays([a, water], completions, MON);
    expect(days.map((d) => d.status)).toEqual(["done", "missed", "pending"]);
  });
});

describe("reorderSubset", () => {
  it("mueve sólo los elementos del subconjunto, en sus mismos lugares", () => {
    // b y d se intercambian; a, c y e quedan donde estaban.
    expect(reorderSubset(["a", "b", "c", "d", "e"], ["d", "b"])).toEqual([
      "a",
      "d",
      "c",
      "b",
      "e",
    ]);
  });

  it("con la lista completa devuelve el orden nuevo", () => {
    expect(reorderSubset(["a", "b", "c"], ["c", "a", "b"])).toEqual([
      "c",
      "a",
      "b",
    ]);
  });
});

describe("appliesOn", () => {
  it("no aplica antes de la creación del hábito", () => {
    const h = habit({ type: "daily" }, MON);
    expect(appliesOn(h, "2026-09-27")).toBe(false);
    expect(appliesOn(h, MON)).toBe(true);
  });

  it("respeta los días fijos", () => {
    const h = habit({ type: "weekdays", days: [0, 2] });
    expect(appliesOn(h, MON)).toBe(true);
    expect(appliesOn(h, "2026-09-29")).toBe(false);
    expect(appliesOn(h, "2026-09-30")).toBe(true);
  });

  it("los semanales aplican cualquier día", () => {
    const h = habit({ type: "timesPerWeek", count: 3 });
    expect(appliesOn(h, "2026-10-04")).toBe(true);
  });
});

describe("isDone", () => {
  const yesNo = habit({ type: "daily" });
  const water = { ...habit({ type: "daily" }), target: 8, unit: "vasos" };

  it("sin registro no está completado", () => {
    expect(isDone(yesNo, undefined)).toBe(false);
    expect(isDone(water, undefined)).toBe(false);
  });

  it("un hábito sí/no se completa con el registro, salvo valor 0", () => {
    expect(isDone(yesNo, {})).toBe(true);
    expect(isDone(yesNo, { note: "hecho" })).toBe(true);
    expect(isDone(yesNo, { value: 0, note: "sólo nota" })).toBe(false);
  });

  it("un hábito medible se completa al llegar a la meta", () => {
    expect(isDone(water, {})).toBe(false);
    expect(isDone(water, { value: 7 })).toBe(false);
    expect(isDone(water, { value: 8 })).toBe(true);
    expect(isDone(water, { value: 10 })).toBe(true);
  });
});

describe("rachas de hábitos medibles", () => {
  it("los días que no llegan a la meta cortan la racha", () => {
    const water = { ...habit({ type: "daily" }, "2026-09-24"), target: 8 };
    const done = doneDays(water, {
      "2026-09-24": { value: 8 },
      "2026-09-25": { value: 9 },
      "2026-09-26": { value: 3 },
      "2026-09-27": { value: 8 },
      [MON]: { value: 2 },
    });
    expect(done).toEqual(new Set(["2026-09-24", "2026-09-25", "2026-09-27"]));
    const periods = getPeriods(water, done, MON);
    expect(currentStreak(periods)).toBe(1);
    expect(bestStreak(periods)).toBe(2);
  });
});
