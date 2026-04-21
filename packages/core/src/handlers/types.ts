import type { Db } from "@horva/db/client";

export interface Session {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface HandlerContext {
  db: Db;
  session: Session | null;
}

export interface HandlerArgs<TInput = unknown> {
  input: TInput;
  context: HandlerContext;
}
