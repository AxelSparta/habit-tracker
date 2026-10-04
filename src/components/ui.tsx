import Link from "next/link";
import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-border bg-surface p-4 sm:p-5 ${className}`}
    >
      {children}
    </section>
  );
}

export function Loading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Cargando">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-2" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  /** Reemplaza al link a /habitos. */
  action?: ReactNode;
}) {
  return (
    <Card className="text-center">
      <p className="text-3xl">🌱</p>
      <h2 className="mt-2 font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{text}</p>
      {action ?? (
        <Link
          href="/habitos"
          className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          Crear un hábito
        </Link>
      )}
    </Card>
  );
}

export function StreakBadge({ value, unit }: { value: number; unit: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${
        value > 0 ? "bg-streak/15 text-foreground" : "bg-surface-2 text-muted"
      }`}
      title={`Racha actual: ${value} ${unit}`}
    >
      <span aria-hidden>{value > 0 ? "🔥" : "○"}</span>
      {value} {unit}
    </span>
  );
}
