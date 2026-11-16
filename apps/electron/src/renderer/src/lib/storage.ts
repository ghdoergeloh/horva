/** Where the data lives: a folder on this device, or a PostgreSQL server. */
export type Storage = "local" | "server";

/**
 * The first state of the setup wizard. A URL from config.json is kept: a
 * `file:` URL stays the local folder (it may come from `horva init`), a
 * `postgres:` URL stays the server. Without one, the app's own folder is
 * the default.
 */
export function initialStorage(
  databaseUrl: string,
  localDatabaseUrl: string,
): { storage: Storage; localUrl: string; serverUrl: string } {
  if (databaseUrl.startsWith("postgres")) {
    return {
      storage: "server",
      localUrl: localDatabaseUrl,
      serverUrl: databaseUrl,
    };
  }
  const localUrl = databaseUrl.startsWith("file:")
    ? databaseUrl
    : localDatabaseUrl;
  return { storage: "local", localUrl, serverUrl: "" };
}

/** The folder path of a `file:` URL, for display. */
export function folderOf(fileUrl: string): string {
  return decodeURIComponent(new URL(fileUrl).pathname);
}
