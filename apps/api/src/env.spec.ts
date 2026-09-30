import { describe, expect, it } from "vitest";

import { loadEnv } from "./env";

const minimal = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/app",
  BETTER_AUTH_SECRET: "a-secret-that-is-at-least-32-characters",
  BETTER_AUTH_URL: "http://localhost:5173",
};

describe("loadEnv", () => {
  it("fills in the defaults", () => {
    expect(loadEnv(minimal)).toEqual({
      production: false,
      port: 3000,
      databaseUrl: minimal.DATABASE_URL,
      auth: {
        secret: minimal.BETTER_AUTH_SECRET,
        url: "http://localhost:5173",
      },
      trustedOrigins: [],
      spaDir: null,
      smtp: null,
    });
  });

  it("names every missing or invalid variable at once", () => {
    expect(() =>
      loadEnv({ BETTER_AUTH_SECRET: "short", BETTER_AUTH_URL: "nope" }),
    ).toThrow(/DATABASE_URL[\s\S]*BETTER_AUTH_SECRET[\s\S]*BETTER_AUTH_URL/);
  });

  it("splits the trusted origins and checks each one", () => {
    expect(
      loadEnv({
        ...minimal,
        TRUSTED_ORIGINS: "https://a.example.test, https://b.example.test",
      }).trustedOrigins,
    ).toEqual(["https://a.example.test", "https://b.example.test"]);
    expect(() => loadEnv({ ...minimal, TRUSTED_ORIGINS: "not-a-url" })).toThrow(
      /TRUSTED_ORIGINS/,
    );
  });

  it("turns email verification on with SMTP_HOST and SMTP_FROM", () => {
    expect(
      loadEnv({
        ...minimal,
        SMTP_HOST: "localhost",
        SMTP_PORT: "1025",
        SMTP_FROM: "noreply@example.test",
      }).smtp,
    ).toEqual({
      host: "localhost",
      port: 1025,
      secure: false,
      from: "noreply@example.test",
    });
    expect(() => loadEnv({ ...minimal, SMTP_HOST: "localhost" })).toThrow(
      /SMTP_FROM/,
    );
  });

  it("treats empty values as not set", () => {
    expect(loadEnv({ ...minimal, SPA_DIR: " ", SMTP_HOST: "" })).toMatchObject({
      spaDir: null,
      smtp: null,
    });
  });
});
