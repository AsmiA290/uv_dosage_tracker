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

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {DESTINATIONS.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-16 flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors",
                isActive ? "text-[var(--accent)]" : "text-[var(--muted-foreground)]"
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
