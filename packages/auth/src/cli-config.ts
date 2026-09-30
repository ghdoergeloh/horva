import { createDatabase } from "@horva/db/client";

import { createAuth } from "./auth";

/**
 * Configuration for the better-auth CLI (`pnpm -F @horva/auth generate`),
 * which writes `packages/db/src/schema/auth-schema.ts`. Every optional
 * feature is on, so the schema covers all of them. The values are
 * placeholders; the CLI does not connect to the database.
 */
export const auth = createAuth({
  db: createDatabase("postgresql://unused@localhost/unused").db,
  secret: "cli-only-placeholder-secret-of-32-chars",
  baseURL: "http://localhost:3000",
  sendVerificationEmail: () => Promise.resolve(),
  sendResetPasswordEmail: () => Promise.resolve(),
});
