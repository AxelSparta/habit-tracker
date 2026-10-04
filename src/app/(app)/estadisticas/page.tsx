import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { StatsView } from "@/components/stats-view";

export const metadata: Metadata = { title: "Hábitos · Estadísticas" };

export default async function StatsPage() {
  // Sin sesión, redirige a /sign-in.
  await auth.protect();
  return <StatsView />;
}
