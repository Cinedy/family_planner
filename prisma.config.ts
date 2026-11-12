import { config } from "dotenv"
config({ path: ".env.local" })
import { defineConfig } from "prisma/config"

// The Prisma CLI (migrations) needs a direct connection: Neon's pooled endpoint
// ("-pooler" in the host) doesn't support the locks migrations use. The app itself
// keeps using the pooled DATABASE_URL (see lib/prisma.ts).
const directUrl =
  process.env.DIRECT_URL ?? process.env.DATABASE_URL?.replace("-pooler.", ".")

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: directUrl,
  },
})
