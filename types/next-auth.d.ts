import type { DefaultSession } from "next-auth"
// Imported so the augmentation below extends next-auth/jwt
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
  }
}
