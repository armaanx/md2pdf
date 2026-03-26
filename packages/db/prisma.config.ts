import "dotenv/config";
import { defineConfig } from "prisma/config";

const fallbackDatabaseUrl = "postgresql://postgres:postgres@localhost:5433/md2pdf?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    url: process.env.DATABASE_URL ?? fallbackDatabaseUrl
  }
});
