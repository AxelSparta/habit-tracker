import type { ReactNode } from "react";
import { ErrorBanner } from "@/components/error-banner";
import { LocalDataImport } from "@/components/local-data-import";
import { Nav } from "@/components/nav";
import { HabitStoreProvider } from "@/lib/store";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <HabitStoreProvider>
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-10">
        <ErrorBanner />
        <LocalDataImport />
        {children}
      </main>
    </HabitStoreProvider>
  );
}
