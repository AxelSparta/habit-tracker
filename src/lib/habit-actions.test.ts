import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  createActions,
  createRunner,
  fetchAll,
  nextPosition,
  PAGE,
  parseBackup,
  type Run,
} from "./habit-actions";
import type { Habit, HabitData } from "./types";

/** Una request armada con el query builder, tal como llegaría a PostgREST. */
interface Call {
  table: string;
  op?: string;
  payload?: unknown;
  filters: [string, unknown][];
}

type Responder = (call: Call) => { data?: unknown; error?: unknown };

/**
 * Cliente de Supabase falso: registra cada request y responde con
 * `respond(call)` al hacerle `await`.
 */
function fakeSupabase(respond: Responder = () => ({})) {
  const calls: Call[] = [];
  const client = {
    from(table: string) {
      const call: Call = { table, filters: [] };
      calls.push(call);
      const builder = {
        then(resolve: (r: unknown) => void, reject: (e: unknown) => void) {
          const { data = null, error = null } = respond(call);
          return Promise.resolve({ data, error }).then(resolve, reject);
        },
      } as Record<string, unknown>;
      for (const op of ["select", "insert", "update", "delete", "upsert"]) {
        builder[op] = (payload?: unknown) => {
          call.op = op;
          call.payload = payload;
          return builder;
        };
      }
      for (const filter of ["eq", "match", "order", "range"]) {
        builder[filter] = (...args: unknown[]) => {
          call.filters.push([filter, args]);
          return builder;
        };
      }
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

function habit(id: string, position: number): Habit {
  return {
    id,
    name: id,
    emoji: "✅",
    frequency: { type: "daily" },
    createdAt: "2026-09-01",
    archived: false,
    position,
  };
}

/** Arma las acciones sobre un estado local, como hace el provider. */
function setup(initial: HabitData, respond?: Responder) {
  const { client, calls } = fakeSupabase(respond);
  const state = { data: initial };
  const onError = vi.fn();
  const reload = vi.fn(async () => {});
  const run: Run = createRunner(onError, reload);
  const actions = createActions(
    client,
    initial,
    (updater) => {
      state.data = updater(state.data);
    },
    run,
    reload,
  );
  return { actions, state, calls, onError, reload };
}

const data = (habits: Habit[], completions = {}): HabitData => ({
  version: 1,
  habits,
  completions,
});

describe("createRunner", () => {
  it("no hace nada extra si la escritura sale bien", async () => {
    const onError = vi.fn();
    const reload = vi.fn(async () => {});
    await createRunner(onError, reload)(async () => ({ error: null }));
    expect(onError).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it("si falla, avisa el error y recarga del servidor", async () => {
    const onError = vi.fn();
    const reload = vi.fn(async () => {});
    await createRunner(
      onError,
      reload,
    )(async () => ({
      error: { message: "sin permiso" },
    }));
    expect(onError).toHaveBeenCalledWith("sin permiso");
    expect(reload).toHaveBeenCalledOnce();
  });
});

describe("toggleCompletion", () => {
  it("marca el día en el estado (ordenado) e inserta la fila", async () => {
    const { actions, state, calls } = setup(
      data([habit("a", 0)], { a: ["2026-10-01", "2026-10-03"] }),
    );
    await actions.toggleCompletion("a", "2026-10-02", false);
    expect(state.data.completions.a).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
    ]);
    expect(calls).toEqual([
      {
        table: "completions",
        op: "insert",
        payload: { habit_id: "a", day: "2026-10-02" },
        filters: [],
      },
    ]);
  });

  it("desmarca el día y borra sólo esa fila", async () => {
    const { actions, state, calls } = setup(
      data([habit("a", 0)], { a: ["2026-10-01"] }),
    );
    await actions.toggleCompletion("a", "2026-10-01", true);
    expect(state.data.completions.a).toEqual([]);
    expect(calls[0].op).toBe("delete");
    expect(calls[0].filters).toEqual([
      ["match", [{ habit_id: "a", day: "2026-10-01" }]],
    ]);
  });

  it("si el servidor rechaza, recarga para descartar el cambio local", async () => {
    const { actions, onError, reload } = setup(data([habit("a", 0)]), () => ({
      error: { message: "falló" },
    }));
    await actions.toggleCompletion("a", "2026-10-01", false);
    expect(onError).toHaveBeenCalledWith("falló");
    expect(reload).toHaveBeenCalledOnce();
  });
});

describe("reorderHabits", () => {
  const habits = [habit("a", 0), habit("b", 1), habit("c", 2)];

  it("sólo actualiza las filas que cambiaron de lugar", async () => {
    const { actions, state, calls } = setup(data(habits));
    await actions.reorderHabits(["a", "c", "b"]);
    expect(state.data.habits.map((h) => [h.id, h.position])).toEqual([
      ["a", 0],
      ["c", 1],
      ["b", 2],
    ]);
    // Las requests van en paralelo: se compara sin importar el orden.
    const updates = calls.map((c) => [c.filters[0]?.[1], c.payload]);
    expect(updates).toHaveLength(2);
    expect(updates).toEqual(
      expect.arrayContaining([
        [["id", "c"], { position: 1 }],
        [["id", "b"], { position: 2 }],
      ]),
    );
  });

  it("no manda nada si el orden es el mismo", async () => {
    const { actions, calls } = setup(data(habits));
    await actions.reorderHabits(["a", "b", "c"]);
    expect(calls).toEqual([]);
  });

  it("si falla una de las filas, recarga", async () => {
    const { actions, reload } = setup(data(habits), (call) =>
      call.filters[0]?.[1]?.toString() === "id,b"
        ? { error: { message: "falló" } }
        : {},
    );
    await actions.reorderHabits(["a", "c", "b"]);
    expect(reload).toHaveBeenCalledOnce();
  });
});

describe("addHabit, updateHabit y deleteHabit", () => {
  it("agrega el hábito al final", async () => {
    const { actions, state, calls } = setup(data([habit("a", 4)]));
    await actions.addHabit({
      name: "Leer",
      emoji: "📚",
      frequency: { type: "daily" },
    });
    const added = state.data.habits[1];
    expect(added.position).toBe(5);
    expect(calls[0]).toMatchObject({
      table: "habits",
      op: "insert",
      payload: { id: added.id, name: "Leer", position: 5 },
    });
  });

  it("traduce createdAt a la columna created_on", async () => {
    const { actions, calls } = setup(data([habit("a", 0)]));
    await actions.updateHabit("a", { createdAt: "2026-01-01", name: "X" });
    expect(calls[0].payload).toEqual({ name: "X", created_on: "2026-01-01" });
  });

  it("al borrar un hábito también quita sus completados", async () => {
    const { actions, state } = setup(
      data([habit("a", 0), habit("b", 1)], { a: ["2026-10-01"], b: [] }),
    );
    await actions.deleteHabit("a");
    expect(state.data.habits.map((h) => h.id)).toEqual(["b"]);
    expect(state.data.completions).toEqual({ b: [] });
  });
});

describe("parseBackup", () => {
  it("rechaza un JSON sin hábitos", () => {
    expect(() => parseBackup('{"completions":{}}', [])).toThrow(
      "Formato de datos inválido",
    );
  });

  it("los hábitos existentes conservan su lugar y los nuevos van al final", () => {
    const backup = JSON.stringify({
      habits: [
        { ...habit("nuevo1", 0) },
        { ...habit("a", 9) },
        { ...habit("nuevo2", 0) },
      ],
      completions: { a: ["2026-10-01"] },
    });
    const parsed = parseBackup(backup, [habit("a", 3), habit("b", 7)]);
    expect(parsed.habits.map((h) => [h.id, h.position])).toEqual([
      ["nuevo1", 8],
      ["a", 3],
      ["nuevo2", 9],
    ]);
    expect(parsed.completions).toEqual({ a: ["2026-10-01"] });
  });
});

describe("nextPosition", () => {
  it("es 0 sin hábitos y max + 1 con hábitos", () => {
    expect(nextPosition([])).toBe(0);
    expect(nextPosition([habit("a", 2), habit("b", 7)])).toBe(8);
  });
});

describe("fetchAll", () => {
  it("pagina los completados hasta recibir una página incompleta", async () => {
    const day = "2026-10-01";
    const { client, calls } = fakeSupabase((call) => {
      if (call.table === "habits") return { data: [] };
      const [from] = call.filters.find(([f]) => f === "range")![1] as number[];
      const size = from === 0 ? PAGE : 2;
      return {
        data: Array.from({ length: size }, () => ({ habit_id: "a", day })),
      };
    });
    const result = await fetchAll(client);
    expect(result.completions.a).toHaveLength(PAGE + 2);
    expect(calls.filter((c) => c.table === "completions")).toHaveLength(2);
  });

  it("propaga el error de Supabase", async () => {
    const { client } = fakeSupabase(() => ({ error: { message: "caído" } }));
    await expect(fetchAll(client)).rejects.toMatchObject({ message: "caído" });
  });
});

describe("importJSON", () => {
  it("sube los completados en tandas y recarga", async () => {
    const days = Array.from({ length: PAGE + 1 }, (_, i) =>
      new Date(Date.UTC(2020, 0, 1 + i)).toISOString().slice(0, 10),
    );
    const { actions, calls, reload } = setup(data([]));
    await actions.importJSON(
      JSON.stringify({ habits: [habit("a", 0)], completions: { a: days } }),
    );
    const uploads = calls.filter((c) => c.table === "completions");
    expect(uploads.map((c) => (c.payload as unknown[]).length)).toEqual([
      PAGE,
      1,
    ]);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("no sigue si falla el alta de hábitos", async () => {
    const { actions, calls } = setup(data([]), () => ({
      error: { message: "falló" },
    }));
    await expect(
      actions.importJSON(JSON.stringify({ habits: [], completions: {} })),
    ).rejects.toMatchObject({ message: "falló" });
    expect(calls).toHaveLength(1);
  });
});
