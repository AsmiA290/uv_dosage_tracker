import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: { secure: process.env.NODE_ENV === "production" },
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // There's no login screen: every visitor gets a real, private Supabase
  // account transparently via anonymous sign-in, so their data (profile,
  // sessions, sunscreen log) still persists across visits on this device
  // and is still protected by the same RLS policies as a "real" account.
  // Anonymous sign-in sets the session cookie on `supabaseResponse`, which
  // is why this call happens here instead of in a page/layout.
  if (!user) {
    await supabase.auth.signInAnonymously()
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  return supabaseResponse
}
