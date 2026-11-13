/**
 * Checks a database URL for `horva init`: a PostgreSQL server
 * (`postgres://`) or a PGlite folder (`file:///path`). Returns true or the
 * message to show.
 */
export function validateDatabaseUrl(url: string): true | string {
  return /^(postgres(ql)?:\/\/|file:\/\/\/)/.test(url)
    ? true
    : "Must be a postgres:// URL or a file:/// URL of a folder";
}
