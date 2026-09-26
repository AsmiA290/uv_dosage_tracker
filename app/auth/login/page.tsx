"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Sun } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"

// Only the credential/existence signal is genericized, since naming it would
// confirm whether an email is registered. Errors the user can act on are
// passed through.
function loginErrorMessage(error: unknown): string {
  const { code, status } = (error ?? {}) as { code?: string; status?: number }

  if (code === "email_not_confirmed") {
    return "Please confirm your email address. Check your inbox for the link."
  }
  if (code === "over_request_rate_limit" || status === 429) {
    return "Too many attempts. Please wait a moment and try again."
  }
  if (code === "invalid_credentials") {
    return "Invalid email or password."
  }
  return "Something went wrong. Please try again."
}

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? "/"

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient({ rememberMe })
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push(next as Parameters<typeof router.push>[0])
      router.refresh()
    } catch (error: unknown) {
      console.error("[v0] Login error:", error)
      setError(loginErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

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
        <div className="glass-panel flex flex-col gap-6 rounded-[calc(var(--radius)+10px)] p-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="glass-pill flex size-12 items-center justify-center rounded-full">
              <Sun className="size-6 text-[var(--accent)]" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-xl font-semibold">Sign in</h1>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Track your personal UV dose and sunburn budget
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-panel-solid h-11 rounded-[var(--radius)] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-panel-solid h-11 rounded-[var(--radius)] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              />
            </div>

            <label className="flex items-center gap-2.5 text-sm text-[var(--foreground)]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-4 rounded border-[var(--border)] accent-[var(--accent)]"
              />
              Remember me on this device
            </label>

            {error && <p className="text-sm text-[var(--risk-high)]">{error}</p>}

            <Button type="submit" variant="glass" size="session" className="glass-cta" disabled={isLoading}>
              {isLoading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-sm text-[var(--muted-foreground)]">
            Don&apos;t have an account?{" "}
            <Link href="/auth/sign-up" className="font-medium text-[var(--foreground)] underline underline-offset-4">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
