/** Día de la semana: 0 = lunes … 6 = domingo. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Frequency =
  | { type: "daily" }
  | { type: "weekdays"; days: Weekday[] }
  | { type: "timesPerWeek"; count: number };

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  frequency: Frequency;
  /** Fecha de creación en formato YYYY-MM-DD (hora local). */
  createdAt: string;
  archived: boolean;
}

export interface HabitData {
  version: 1;
  habits: Habit[];
  /** habitId -> lista de fechas YYYY-MM-DD completadas. */
  completions: Record<string, string[]>;
}
