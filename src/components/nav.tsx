"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const LINKS = [
  { href: "/", label: "Hoy", icon: <TodayIcon /> },
  { href: "/habitos", label: "Hábitos", icon: <ListIcon /> },
  { href: "/estadisticas", label: "Estadísticas", icon: <ChartIcon /> },
] as const;

/**
 * Navegación: barra lateral en escritorio y, en el celular, una barra superior
 * con el logo más una barra flotante de íconos abajo.
 */
export function Nav() {
  const pathname = usePathname();
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface px-3 py-4 md:flex">
        <Logo className="px-2" />
        <nav className="mt-6">
          <ul className="space-y-0.5 text-sm">
            {LINKS.map(({ href, label, icon }) => {
              const active = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-sm px-2 py-1.5 transition-colors ${
                      active
                        ? "bg-surface-2 font-medium text-foreground"
                        : "text-muted hover:bg-surface-2/60 hover:text-foreground"
                    }`}
                  >
                    {icon}
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-auto rounded-sm bg-surface-2/60 p-2">
          <UserButton showName />
        </div>
      </aside>

      <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <Logo />
        <UserButton />
      </header>

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-20 flex justify-center pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden"
      >
        <ul className="flex gap-1 rounded-lg border border-border bg-surface-2/95 p-1.5 shadow-lg backdrop-blur">
          {LINKS.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  aria-label={label}
                  title={label}
                  className={`flex size-11 items-center justify-center rounded-sm transition-colors ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {icon}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`flex items-center gap-2 font-semibold tracking-tight ${className}`}
    >
      <span
        aria-hidden
        className="flex size-7 items-center justify-center rounded-sm bg-accent-soft text-sm"
      >
        🔥
      </span>
      Hábitos
    </Link>
  );
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-[18px] shrink-0"
    >
      {children}
    </svg>
  );
}

function TodayIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </Icon>
  );
}

function ListIcon() {
  return (
    <Icon>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </Icon>
  );
}

function ChartIcon() {
  return (
    <Icon>
      <path d="M3 3v18h18" />
      <path d="m7 15 4-4 3 3 5-6" />
    </Icon>
  );
}
