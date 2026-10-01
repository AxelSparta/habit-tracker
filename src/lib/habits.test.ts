import { describe, expect, it } from "vitest";
import {
  bestStreak,
  completionRate,
  currentStreak,
  getGlobalDays,
  getPeriods,
} from "./habits";
import type { Frequency, Habit } from "./types";

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
  };
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
      a: ["2026-09-25", "2026-09-26", "2026-09-27"],
      b: ["2026-09-27"],
    };
    const days = getGlobalDays([a, b, weekly], completions, MON);
    expect(currentStreak(days)).toBe(3);

    const missingSunday = getGlobalDays([a, b], { ...completions, b: [] }, MON);
    expect(currentStreak(missingSunday)).toBe(0);
  });
});
