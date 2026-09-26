"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Sun } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

// Supabase does not reveal whether an email is already registered, so the
// fallback stays generic. Validation failures describe the user's own input.
function signUpErrorMessage(error: unknown): string {
  const { code, status } = (error ?? {}) as { code?: string; status?: number }

  if (code === "weak_password") {
    return "Please choose a stronger password."
  }
  if (code === "email_address_invalid") {
    return "Please use a real email address. Example and test domains are not supported."
  }
  if (code === "email_address_not_authorized") {
    return "We cannot send confirmation email to that address. Please use a different one."
  }
  if (code === "validation_failed") {
    return "Please check the details you entered."
  }
  if (code === "over_email_send_rate_limit" || status === 429) {
    return "Too many attempts. Please wait a moment and try again."
  }
  return "Unable to complete sign-up. Please try again."
}

export default function Page() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      router.push("/auth/sign-up-success")
    } catch (error: unknown) {
      console.error("[v0] Sign-up error:", error)
      setError(signUpErrorMessage(error))
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
              <h1 className="text-xl font-semibold">Create account</h1>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">Start tracking your personal UV dose</p>
            </div>
          </div>

          <form onSubmit={handleSignUp} className="flex flex-col gap-5">
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="repeat-password">Repeat password</Label>
              <input
                id="repeat-password"
                type="password"
                required
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                className="glass-panel-solid h-11 rounded-[var(--radius)] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              />
            </div>
            {error && <p className="text-sm text-[var(--risk-high)]">{error}</p>}
            <Button type="submit" variant="glass" size="session" className="glass-cta" disabled={isLoading}>
              {isLoading ? "Creating account…" : "Sign up"}
            </Button>
          </form>

          <p className="text-center text-sm text-[var(--muted-foreground)]">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-medium text-[var(--foreground)] underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
