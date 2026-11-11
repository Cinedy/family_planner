import NextAuth from "next-auth"
import { authConfig } from "./auth.config"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  const isPublicRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/invite") ||
    // API routes check the session themselves and answer 401 (no redirect)
    pathname.startsWith("/api/")

  if (isPublicRoute) return

  if (!isLoggedIn) {
    return Response.redirect(new URL("/login", req.url))
  }
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
