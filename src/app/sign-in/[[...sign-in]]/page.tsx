import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <p className="text-2xl font-semibold tracking-tight">🔥 Hábitos</p>
      <SignIn />
    </div>
  );
}
