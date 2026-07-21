import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Supabase の Direct connection（Session pooler でも可）を指定する
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
