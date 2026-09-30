import type { Database, DatabaseConnection } from "./client.js";
import { createDatabase } from "./client.js";

/**
 * A connection that opens its pool on the first query, with the URL that
 * `getUrl` returns at that moment. For apps that learn the URL after they
 * start: the CLI after `horva init`, Electron after its setup wizard.
 * `close()` ends the pool; the next query opens a new one.
 */
export function createLazyDatabase(
  getUrl: () => string | undefined,
): DatabaseConnection {
  let connection: DatabaseConnection | undefined;
  const connect = (): DatabaseConnection => {
    if (!connection) {
      const url = getUrl();
      if (!url) throw new Error("DATABASE_URL is not set");
      connection = createDatabase(url);
    }
    return connection;
  };
  const db = new Proxy({} as Database, {
    get(_target, prop) {
      const real = connect().db;
      const value: unknown = Reflect.get(real, prop, real);
      // Methods keep the drizzle instance as `this`.
      return typeof value === "function"
        ? (value as (...args: unknown[]) => unknown).bind(real)
        : value;
    },
  });
  return {
    db,
    ping: () => connect().ping(),
    close: async () => {
      const open = connection;
      connection = undefined;
      await open?.close();
    },
  };
}
