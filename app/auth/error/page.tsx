import { AlertTriangle } from "lucide-react"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>
}) {
  const params = await searchParams
  // `error` comes from the URL, so it is attacker-controlled. Render it only
  // when it looks like a Supabase error code, never as free text someone can choose.
  const code = params?.error
  const isErrorCode = typeof code === "string" && /^[a-z0-9_]{1,64}$/.test(code)

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
            <AlertTriangle className="size-6 text-[var(--risk-medium)]" aria-hidden="true" />
          </span>
          <h1 className="text-xl font-semibold">Sorry, something went wrong</h1>
          {isErrorCode ? (
            <p className="text-sm text-[var(--muted-foreground)]">Code error: {code}</p>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">An unspecified error occurred.</p>
          )}
        </div>
      </div>
    </div>
  )
}
