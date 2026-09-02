import "dotenv/config";

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // `prisma generate` does not connect to the database, so allow dependency
    // installation before a local .env file has been created.
    url: process.env.DATABASE_URL ?? "postgresql://localhost/liver_store",
  },
});
