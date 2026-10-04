import { auth } from "@clerk/nextjs/server";
import { TodayView } from "@/components/today-view";

export default async function Home() {
  // Sin sesión, redirige a /sign-in.
  await auth.protect();
  return <TodayView />;
}
