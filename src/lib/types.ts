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
  /** Orden manual elegido por el usuario (menor = más arriba). */
  position: number;
  /** Meta diaria de un hábito medible; sin meta es un hábito sí/no. */
  target?: number;
  /** Unidad de la meta, ej. "vasos" o "min". */
  unit?: string;
}

/** Registro de un hábito en un día. */
export interface Entry {
  /** Cantidad hecha (hábitos medibles). En un hábito sí/no, sin valor = marcado. */
  value?: number;
  note?: string;
}

/** habitId -> fecha YYYY-MM-DD -> registro de ese día. */
export type Completions = Record<string, Record<string, Entry>>;

export interface HabitData {
  version: 2;
  habits: Habit[];
  completions: Completions;
}
