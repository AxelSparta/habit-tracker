import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <p className="text-2xl font-semibold tracking-tight">🔥 Hábitos</p>
      <SignUp />
    </div>
  );
}
