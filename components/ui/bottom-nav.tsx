"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sun, Timer, LineChart, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/provider"

/**
 * Exactly four destinations, by design — this is a hard scope constraint
 * for the whole app, not a placeholder list. Do not add a fifth item.
 */
const DESTINATIONS = [
  { href: "/", key: "now", icon: Sun },
  { href: "/session", key: "session", icon: Timer },
  { href: "/history", key: "history", icon: LineChart },
  { href: "/methods", key: "methods", icon: BookOpen },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const { m } = useI18n()

  // No meaningful nav destination mid-onboarding.
  if (pathname.startsWith("/onboarding")) {
    return null
  }

  return (
    <nav
      aria-label={m.nav.label}
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="glass-pill flex items-stretch justify-around rounded-full px-1.5 py-1">
        {DESTINATIONS.map(({ href, key, icon: Icon }) => {
          const label = m.nav[key]
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-2 text-xs font-medium transition-colors",
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
              <span className="max-w-full truncate">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
