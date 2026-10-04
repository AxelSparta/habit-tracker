import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { HabitsManager } from "@/components/habits-manager";

export const metadata: Metadata = { title: "Hábitos · Gestionar" };

export default async function HabitsPage() {
  // Sin sesión, redirige a /sign-in.
  await auth.protect();
  return <HabitsManager />;
}
