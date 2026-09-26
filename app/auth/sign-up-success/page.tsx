import { MailCheck } from "lucide-react"

export default function Page() {
  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 60% at 15% -10%, color-mix(in srgb, #7dd3fc 30%, transparent) 0%, transparent 60%), radial-gradient(100% 55% at 100% 0%, color-mix(in srgb, #fde68a 24%, transparent) 0%, transparent 55%)",
        }}
      />
      <div className="relative z-10 w-full max-w-sm">
        <div className="glass-panel flex flex-col items-center gap-4 rounded-[calc(var(--radius)+10px)] p-8 text-center">
          <span className="glass-pill flex size-12 items-center justify-center rounded-full">
            <MailCheck className="size-6 text-[var(--accent)]" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">Check your email</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Confirm your account to continue</p>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            You&apos;ve successfully signed up. Please check your email to confirm your account before signing in.
          </p>
        </div>
      </div>
    </div>
  )
}
