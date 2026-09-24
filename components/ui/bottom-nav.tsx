"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sun, Timer, LineChart, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Exactly four destinations, by design — this is a hard scope constraint
 * for the whole app, not a placeholder list. Do not add a fifth item.
 */
const DESTINATIONS = [
  { href: "/", label: "Now", icon: Sun },
  { href: "/session", label: "Session", icon: Timer },
  { href: "/history", label: "History", icon: LineChart },
  { href: "/methods", label: "Methods", icon: BookOpen },
] as const

export function BottomNav() {
  const pathname = usePathname()

  // No meaningful nav destination while signed out or mid-onboarding.
  if (pathname.startsWith("/auth") || pathname.startsWith("/onboarding")) {
    return null
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="glass-pill flex items-stretch justify-around rounded-full px-1.5 py-1">
        {DESTINATIONS.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-2 text-xs font-medium transition-colors",
                isActive
                  ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                  : "text-[var(--muted-foreground)]"
              )}
            >
              <Icon
                className="size-6"
                strokeWidth={isActive ? 2.5 : 2}
                aria-hidden="true"
              />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
