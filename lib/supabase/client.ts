import { createBrowserClient } from "@supabase/ssr"

/**
 * `rememberMe: false` (default true) drops the session cookie's Max-Age so
 * it becomes a browser-session cookie instead of persisting for 30 days —
 * used by the "Remember me" checkbox on the login page.
 */
export function createClient(options?: { rememberMe?: boolean }) {
  const rememberMe = options?.rememberMe ?? true

  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      maxAge: rememberMe ? 60 * 60 * 24 * 30 : undefined,
    },
  })
}
