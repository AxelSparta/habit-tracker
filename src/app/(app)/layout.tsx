import type { ReactNode } from "react";
import { ErrorBanner } from "@/components/error-banner";
import { LocalDataImport } from "@/components/local-data-import";
import { Nav } from "@/components/nav";
import { HabitStoreProvider } from "@/lib/store";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <HabitStoreProvider>
      <div className="flex flex-1 flex-col md:flex-row">
        <Nav />
        {/* pb-28: en el celular deja lugar para la barra de navegación flotante. */}
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-28 sm:pt-10 md:pb-10">
          <ErrorBanner />
          <LocalDataImport />
          {children}
        </main>
      </div>
    </HabitStoreProvider>
  );
}
