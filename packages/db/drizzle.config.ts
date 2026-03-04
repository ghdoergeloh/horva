import "dotenv/config";

import { defineConfig } from "drizzle-kit";

if (!process.env["TT_DATABASE_URL"]) {
  throw new Error("Missing TT_DATABASE_URL");
}

export default defineConfig({
  out: "./drizzle",
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env["TT_DATABASE_URL"],
  },
});
