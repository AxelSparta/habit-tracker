import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  createActions,
  createRunner,
  fetchAll,
  nextPosition,
  NOTE_MAX,
  PAGE,
  parseBackup,
  type Run,
} from "./habit-actions";
import type { Completions, Habit, HabitData } from "./types";

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

/** Fila de `habits` tal como la devuelve Supabase. */
function habitRow(id: string) {
  return {
    id,
    name: id,
    emoji: "✅",
    frequency: { type: "daily" },
    created_on: "2026-09-01",
    archived: false,
    position: 0,
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

const data = (habits: Habit[], completions: Completions = {}): HabitData => ({
  version: 2,
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
  it("marca el día en el estado e inserta la fila", async () => {
    const { actions, state, calls } = setup(
      data([habit("a", 0)], { a: { "2026-10-01": {}, "2026-10-03": {} } }),
    );
    await actions.toggleCompletion("a", "2026-10-02", false);
    expect(state.data.completions.a).toEqual({
      "2026-10-01": {},
      "2026-10-02": {},
      "2026-10-03": {},
    });
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
      data([habit("a", 0)], { a: { "2026-10-01": {} } }),
    );
    await actions.toggleCompletion("a", "2026-10-01", true);
    expect(state.data.completions.a).toEqual({});
    expect(calls[0].op).toBe("delete");
    expect(calls[0].filters).toEqual([
      ["match", [{ habit_id: "a", day: "2026-10-01" }]],
    ]);
  });

  it("ignora fechas futuras", async () => {
    const before = data([habit("a", 0)]);
    const { actions, state, calls } = setup(before);
    await actions.toggleCompletion("a", "2999-01-01", false);
    expect(state.data).toBe(before);
    expect(calls).toEqual([]);
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

describe("toggleCompletion con notas", () => {
  it("al desmarcar un día con nota la conserva con value 0", async () => {
    const { actions, state, calls } = setup(
      data([habit("a", 0)], { a: { "2026-10-01": { note: "uf" } } }),
    );
    await actions.toggleCompletion("a", "2026-10-01", true);
    expect(state.data.completions.a["2026-10-01"]).toEqual({
      value: 0,
      note: "uf",
    });
    expect(calls[0]).toMatchObject({
      op: "upsert",
      payload: { habit_id: "a", day: "2026-10-01", value: 0 },
    });
  });

  it("al marcar un día que sólo tenía nota, lo completa sin perderla", async () => {
    const { actions, state, calls } = setup(
      data([habit("a", 0)], { a: { "2026-10-01": { value: 0, note: "uf" } } }),
    );
    await actions.toggleCompletion("a", "2026-10-01", false);
    expect(state.data.completions.a["2026-10-01"]).toEqual({ note: "uf" });
    expect(calls[0]).toMatchObject({
      op: "upsert",
      payload: { habit_id: "a", day: "2026-10-01", value: null },
    });
  });
});

describe("setNote", () => {
  it("sin registro crea uno con value 0 (no completado)", async () => {
    const { actions, state, calls } = setup(data([habit("a", 0)]));
    await actions.setNote("a", "2026-10-01", "  me dolía la cabeza ");
    expect(state.data.completions.a["2026-10-01"]).toEqual({
      value: 0,
      note: "me dolía la cabeza",
    });
    expect(calls[0]).toMatchObject({
      op: "upsert",
      payload: {
        habit_id: "a",
        day: "2026-10-01",
        value: 0,
        note: "me dolía la cabeza",
      },
    });
  });

  it("en un día completado sólo actualiza la nota", async () => {
    const { actions, state, calls } = setup(
      data([habit("a", 0)], { a: { "2026-10-01": {} } }),
    );
    await actions.setNote("a", "2026-10-01", "bien");
    expect(state.data.completions.a["2026-10-01"]).toEqual({ note: "bien" });
    expect(calls[0].payload).toEqual({
      habit_id: "a",
      day: "2026-10-01",
      note: "bien",
    });
  });

  it("al vaciarla en un día completado manda note null", async () => {
    const { actions, state, calls } = setup(
      data([habit("a", 0)], { a: { "2026-10-01": { note: "bien" } } }),
    );
    await actions.setNote("a", "2026-10-01", "   ");
    expect(state.data.completions.a["2026-10-01"]).toEqual({});
    expect(calls[0].payload).toEqual({
      habit_id: "a",
      day: "2026-10-01",
      note: null,
    });
  });

  it("al vaciarla en un registro que sólo tenía la nota lo borra", async () => {
    const { actions, state, calls } = setup(
      data([habit("a", 0)], { a: { "2026-10-01": { value: 0, note: "x" } } }),
    );
    await actions.setNote("a", "2026-10-01", "");
    expect(state.data.completions.a).toEqual({});
    expect(calls[0].op).toBe("delete");
  });

  it("no manda nada si no cambió, si está vacía sin registro o es futura", async () => {
    const { actions, calls } = setup(
      data([habit("a", 0)], { a: { "2026-10-01": { note: "x" } } }),
    );
    await actions.setNote("a", "2026-10-01", "x ");
    await actions.setNote("a", "2026-10-02", "");
    await actions.setNote("a", "2999-01-01", "hola");
    expect(calls).toEqual([]);
  });

  it("recorta las notas al largo máximo", async () => {
    const { actions, state } = setup(data([habit("a", 0)]));
    await actions.setNote("a", "2026-10-01", "a".repeat(NOTE_MAX + 50));
    expect(state.data.completions.a["2026-10-01"].note).toHaveLength(NOTE_MAX);
  });
});

describe("setValue", () => {
  const water = { ...habit("a", 0), target: 8 };

  it("guarda la cantidad con un upsert y conserva la nota local", async () => {
    const { actions, state, calls } = setup(
      data([water], { a: { "2026-10-01": { value: 2, note: "uf" } } }),
    );
    await actions.setValue("a", "2026-10-01", 3);
    expect(state.data.completions.a["2026-10-01"]).toEqual({
      value: 3,
      note: "uf",
    });
    expect(calls).toEqual([
      {
        table: "completions",
        op: "upsert",
        payload: { habit_id: "a", day: "2026-10-01", value: 3 },
        filters: [],
      },
    ]);
  });

  it("en 0 borra el registro si no tiene nota", async () => {
    const { actions, state, calls } = setup(
      data([water], { a: { "2026-10-01": { value: 1 } } }),
    );
    await actions.setValue("a", "2026-10-01", 0);
    expect(state.data.completions.a).toEqual({});
    expect(calls[0].op).toBe("delete");
  });

  it("en 0 conserva el registro si tiene nota", async () => {
    const { actions, state, calls } = setup(
      data([water], { a: { "2026-10-01": { value: 1, note: "uf" } } }),
    );
    await actions.setValue("a", "2026-10-01", 0);
    expect(state.data.completions.a["2026-10-01"]).toEqual({
      value: 0,
      note: "uf",
    });
    expect(calls[0].op).toBe("upsert");
  });

  it("no baja de 0 ni acepta fechas futuras", async () => {
    const { actions, state, calls } = setup(data([water]));
    await actions.setValue("a", "2999-01-01", 3);
    expect(calls).toEqual([]);
    await actions.setValue("a", "2026-10-01", -2);
    expect(state.data.completions.a).toEqual({});
    expect(calls[0].op).toBe("delete");
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

  it("para quitar la meta manda null a la base", async () => {
    const { actions, state, calls } = setup(
      data([{ ...habit("a", 0), target: 8, unit: "vasos" }]),
    );
    await actions.updateHabit("a", { target: undefined, unit: undefined });
    expect(calls[0].payload).toEqual({ target: null, unit: null });
    expect(state.data.habits[0].target).toBeUndefined();
  });

  it("no toca la meta si no viene en el cambio", async () => {
    const { actions, calls } = setup(data([habit("a", 0)]));
    await actions.updateHabit("a", { archived: true });
    expect(calls[0].payload).toEqual({ archived: true });
  });

  it("al borrar un hábito también quita sus completados", async () => {
    const { actions, state } = setup(
      data([habit("a", 0), habit("b", 1)], { a: { "2026-10-01": {} }, b: {} }),
    );
    await actions.deleteHabit("a");
    expect(state.data.habits.map((h) => h.id)).toEqual(["b"]);
    expect(state.data.completions).toEqual({ b: {} });
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
    expect(parsed.completions).toEqual({ a: { "2026-10-01": {} } });
  });

  it("convierte un respaldo v1 (listas de fechas) a v2", () => {
    const backup = JSON.stringify({
      version: 1,
      habits: [habit("a", 0)],
      completions: { a: ["2026-10-01", "2026-10-02"], b: [] },
    });
    const parsed = parseBackup(backup, []);
    expect(parsed.version).toBe(2);
    expect(parsed.completions).toEqual({
      a: { "2026-10-01": {}, "2026-10-02": {} },
      b: {},
    });
  });

  it("conserva valores y notas de un respaldo v2", () => {
    const completions = {
      a: { "2026-10-01": { value: 3, note: "bien" }, "2026-10-02": {} },
    };
    const backup = JSON.stringify({
      version: 2,
      habits: [{ ...habit("a", 0), target: 8, unit: "vasos" }],
      completions,
    });
    const parsed = parseBackup(backup, []);
    expect(parsed.completions).toEqual(completions);
    expect(parsed.habits[0]).toMatchObject({ target: 8, unit: "vasos" });
  });

  it("rechaza completados nulos", () => {
    expect(() => parseBackup('{"habits":[],"completions":null}', [])).toThrow(
      "Formato de datos inválido",
    );
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
    const { client, calls } = fakeSupabase((call) => {
      if (call.table === "habits") return { data: [] };
      const [from] = call.filters.find(([f]) => f === "range")![1] as number[];
      const size = from === 0 ? PAGE : 2;
      return {
        data: Array.from({ length: size }, (_, i) => ({
          habit_id: "a",
          day: `día-${from + i}`,
          value: null,
          note: null,
        })),
      };
    });
    const result = await fetchAll(client);
    expect(Object.keys(result.completions.a)).toHaveLength(PAGE + 2);
    expect(calls.filter((c) => c.table === "completions")).toHaveLength(2);
  });

  it("arma los registros v2 sin campos nulos", async () => {
    const { client } = fakeSupabase((call) =>
      call.table === "habits"
        ? {
            data: [
              { ...habitRow("a"), target: 8, unit: "vasos" },
              { ...habitRow("b"), target: null, unit: null },
            ],
          }
        : {
            data: [
              { habit_id: "a", day: "2026-10-01", value: 3, note: "uf" },
              { habit_id: "b", day: "2026-10-01", value: null, note: null },
            ],
          },
    );
    const result = await fetchAll(client);
    expect(result.version).toBe(2);
    expect(result.habits[0]).toMatchObject({ target: 8, unit: "vasos" });
    expect(result.habits[1]).not.toHaveProperty("target");
    expect(result.habits[1]).not.toHaveProperty("unit");
    expect(result.completions).toEqual({
      a: { "2026-10-01": { value: 3, note: "uf" } },
      b: { "2026-10-01": {} },
    });
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
    expect((uploads[0].payload as unknown[])[0]).toEqual({
      habit_id: "a",
      day: days[0],
      value: null,
      note: null,
    });
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
