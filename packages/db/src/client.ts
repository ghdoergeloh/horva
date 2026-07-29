import "dotenv/config";

import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema/index.js";

export type Db = NodePgDatabase<typeof schema> & { close(): Promise<void> };

interface Connection {
  pool: pg.Pool;
  db: NodePgDatabase<typeof schema>;
}

function createDb(): Connection {
  if (!process.env["DATABASE_URL"]) {
    throw new Error("DATABASE_URL is not set");
  }
  const pool = new pg.Pool({
    connectionString: process.env["DATABASE_URL"],
  });
  return {
    pool,
    db: drizzle({
      client: pool,
      schema,
    }),
  };
}

let _connection: Connection | undefined;

function getDb(): NodePgDatabase<typeof schema> {
  _connection ??= createDb();
  return _connection.db;
}

export const db: Db = new Proxy<Db>({} as Db, {
  get(_target, prop: keyof Db | "close") {
    if (prop === "close") {
      return async () => {
        await _connection?.pool.end();
        _connection = undefined;
      };
    }
    const db = getDb();
    // The Proxy forwards arbitrary members of the drizzle instance. Methods are
    // re-bound to `db` below so `this` is preserved; the rule can't see through
    // the dynamic access, so the unbound-method warning is a false positive here.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const value = db[prop];
    return typeof value === "function" ? value.bind(db) : value;
  },
});

export default db;
