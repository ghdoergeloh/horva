import type { Database } from "@horva/db/client";

export interface Session {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface HandlerContext {
  db: Database;
  session: Session | null;
}

export interface HandlerArgs<TInput = unknown> {
  input: TInput;
  context: HandlerContext;
}
