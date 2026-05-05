// Prisma 7 config - connection URLs managed here (not in schema.prisma)
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js uses .env.local
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
