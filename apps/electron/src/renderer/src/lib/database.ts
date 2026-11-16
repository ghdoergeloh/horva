// The preload bridge of the database section in the settings.

interface DatabaseBridge {
  /** The URL in use (without its password) and the app's own folder. */
  status(): Promise<{ url: string; localDatabaseUrl: string }>;
  /** Checks a database; `empty` when it holds no rows. Throws if unusable. */
  inspect(url: string): Promise<{ empty: boolean }>;
  /** Uses the database at `url` from now on, with or without a copy. */
  switch(input: { url: string; copy: boolean }): Promise<void>;
}

declare global {
  interface Window {
    database: DatabaseBridge;
  }
}

export const databaseBridge: DatabaseBridge = window.database;
