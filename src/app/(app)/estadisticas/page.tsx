import type { Metadata } from "next";
import { StatsView } from "@/components/stats-view";

export const metadata: Metadata = { title: "Hábitos · Estadísticas" };

export default function StatsPage() {
  return <StatsView />;
}
