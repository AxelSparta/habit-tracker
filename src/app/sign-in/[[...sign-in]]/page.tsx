import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <p className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
        <span
          aria-hidden
          className="flex size-9 items-center justify-center rounded-sm bg-accent-soft text-lg"
        >
          🔥
        </span>
        Hábitos
      </p>
      <SignIn />
    </div>
  );
}
