"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Hoy" },
  { href: "/habitos", label: "Hábitos" },
  { href: "/estadisticas", label: "Estadísticas" },
] as const;

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="border-b border-border bg-surface">
      <nav className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3 sm:gap-4">
        <Link href="/" className="font-semibold tracking-tight">
          🔥 Hábitos
        </Link>
        <ul className="ml-auto flex gap-1 text-sm">
          {LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-md px-3 py-1.5 transition-colors ${
                    active
                      ? "bg-surface-2 font-medium text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        <UserButton />
      </nav>
    </header>
  );
}
