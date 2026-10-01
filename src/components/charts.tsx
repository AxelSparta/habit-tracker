"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { WEEKDAY_SHORT, addDays, formatShort, startOfWeek } from "@/lib/dates";

interface TipState {
  x: number;
  y: number;
  content: ReactNode;
}

/** Tooltip flotante posicionado dentro de un contenedor relativo. */
function useTooltip() {
  const [tip, setTip] = useState<TipState | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);

  // Corre el tooltip para que no se salga del contenedor por los costados.
  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const r = el.getBoundingClientRect();
    const p = parent.getBoundingClientRect();
    const half = r.width / 2;
    const left = tip!.x - half;
    const right = tip!.x + half;
    setShift(left < 0 ? -left : right > p.width ? p.width - right : 0);
  }, [tip]);

  const node = tip && (
    <div
      ref={ref}
      role="tooltip"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-xs shadow-md"
      style={{ left: tip.x + shift, top: tip.y - 8 }}
    >
      {tip.content}
    </div>
  );
  return { show: setTip, hide: () => setTip(null), node };
}

/** Ancho real del contenedor, para que el SVG no escale el texto. */
function useWidth(initial: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

function centerOf(el: Element, container: Element) {
  const r = el.getBoundingClientRect();
  const c = container.getBoundingClientRect();
  return { x: r.left - c.left + r.width / 2, y: r.top - c.top };
}

// ---------------------------------------------------------------------------
// Heatmap de actividad: columnas = semanas, filas = días (lunes a domingo).
// ---------------------------------------------------------------------------

export function ActivityHeatmap({
  counts,
  today,
  weeks = 18,
  maxPerDay,
}: {
  counts: Map<string, number>;
  today: string;
  weeks?: number;
  /** Valor que corresponde al color más intenso (p. ej. cantidad de hábitos). */
  maxPerDay: number;
}) {
  const tooltip = useTooltip();
  const firstMonday = addDays(startOfWeek(today), -(weeks - 1) * 7);
  const columns = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(firstMonday, w * 7 + d)),
  );

  function level(n: number) {
    if (n <= 0) return 0;
    return Math.min(
      4,
      Math.max(1, Math.ceil((n / Math.max(1, maxPerDay)) * 4)),
    );
  }

  return (
    <div className="relative" onMouseLeave={tooltip.hide}>
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        <div className="mr-1 grid grid-rows-7 gap-[3px] text-[10px] leading-none text-muted">
          {WEEKDAY_SHORT.map((d, i) => (
            <span key={d} className="flex h-3.5 items-center sm:h-4">
              {i % 2 === 0 ? d : ""}
            </span>
          ))}
        </div>
        {columns.map((col) => (
          <div key={col[0]} className="grid grid-rows-7 gap-[3px]">
            {col.map((day) => {
              const future = day > today;
              const n = counts.get(day) ?? 0;
              return (
                <span
                  key={day}
                  tabIndex={future ? -1 : 0}
                  aria-label={
                    future ? undefined : `${formatShort(day)}: ${n} completados`
                  }
                  onMouseEnter={(e) => {
                    if (future) return tooltip.hide();
                    const parent = e.currentTarget.closest(".relative")!;
                    tooltip.show({
                      ...centerOf(e.currentTarget, parent),
                      content: (
                        <>
                          <span className="text-muted">
                            {formatShort(day)} ·{" "}
                          </span>
                          <span className="font-medium tabular-nums">{n}</span>{" "}
                          {n === 1 ? "completado" : "completados"}
                        </>
                      ),
                    });
                  }}
                  className="size-3.5 rounded-[3px] outline-none focus-visible:ring-2 focus-visible:ring-accent sm:size-4"
                  style={{
                    background: future
                      ? "transparent"
                      : `var(--heat-${level(n)})`,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[11px] text-muted">
        Menos
        {[0, 1, 2, 3, 4].map((l) => (
          <span
            key={l}
            className="size-3 rounded-[3px]"
            style={{ background: `var(--heat-${l})` }}
          />
        ))}
        Más
      </div>
      {tooltip.node}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Barras semanales: check-ins por semana (una sola serie).
// ---------------------------------------------------------------------------

export function WeeklyBars({
  data,
}: {
  data: { week: string; value: number }[];
}) {
  const tooltip = useTooltip();
  const { ref, width } = useWidth(600);
  const W = Math.max(240, width);
  const H = 180;
  const pad = { top: 16, right: 8, bottom: 22, left: 28 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const max = Math.max(4, ...data.map((d) => d.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const slot = innerW / data.length;
  const barW = Math.min(36, slot - 2);
  const y = (v: number) => pad.top + innerH - (v / top) * innerH;
  const last = data[data.length - 1];
  // Una etiqueta cada ~56px, contando desde la semana más reciente.
  const labelEvery = Math.max(1, Math.ceil(56 / slot));

  return (
    <div ref={ref} className="relative" onMouseLeave={tooltip.hide}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block"
        role="img"
        aria-label="Check-ins por semana"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={pad.left}
              x2={W - pad.right}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text
              x={pad.left - 6}
              y={y(t)}
              dy="0.32em"
              textAnchor="end"
              fontSize={10}
              fill="var(--muted)"
            >
              {t}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.left + slot * i + slot / 2;
          const h = Math.max(0, pad.top + innerH - y(d.value));
          return (
            <g key={d.week}>
              {h > 0 && (
                <path
                  d={roundedTopBar(cx - barW / 2, y(d.value), barW, h, 4)}
                  fill="var(--accent)"
                />
              )}
              {(data.length - 1 - i) % labelEvery === 0 && (
                <text
                  x={cx}
                  y={H - 6}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--muted)"
                >
                  {formatShort(d.week)}
                </text>
              )}
              {/* Zona de hover más grande que la barra. */}
              <rect
                x={pad.left + slot * i}
                y={pad.top}
                width={slot}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => {
                  tooltip.show({
                    x: cx,
                    y: y(d.value),
                    content: (
                      <>
                        <span className="text-muted">
                          Semana del {formatShort(d.week)} ·{" "}
                        </span>
                        <span className="font-medium tabular-nums">
                          {d.value}
                        </span>{" "}
                        check-ins
                      </>
                    ),
                  });
                }}
              />
            </g>
          );
        })}
        {last && last.value > 0 && (
          <text
            x={pad.left + slot * (data.length - 1) + slot / 2}
            y={y(last.value) - 5}
            textAnchor="middle"
            fontSize={11}
            fontWeight={600}
            fill="var(--foreground)"
          >
            {last.value}
          </text>
        )}
      </svg>
      {tooltip.node}
    </div>
  );
}

function roundedTopBar(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

function niceTicks(max: number): number[] {
  const step = [1, 2, 5, 10, 20, 25, 50, 100].find((s) => max / s <= 4) ?? 200;
  const ticks: number[] = [];
  for (let t = 0; t < max + step; t += step) ticks.push(t);
  return ticks;
}

// ---------------------------------------------------------------------------
// Medidor horizontal para porcentajes.
// ---------------------------------------------------------------------------

export function Meter({ value }: { value: number | null }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-12 overflow-hidden sm:w-20 rounded-full bg-surface-2">
        {value !== null && (
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${Math.round(value * 100)}%` }}
          />
        )}
      </div>
      <span className="w-9 text-right text-xs tabular-nums">
        {value === null ? "—" : `${Math.round(value * 100)}%`}
      </span>
    </div>
  );
}
