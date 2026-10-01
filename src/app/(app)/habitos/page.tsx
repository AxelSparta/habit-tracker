import type { Metadata } from "next";
import { HabitsManager } from "@/components/habits-manager";

export const metadata: Metadata = { title: "Hábitos · Gestionar" };

export default function HabitsPage() {
  return <HabitsManager />;
}
