/** Builds the greeting shown to a user. Falls back to "Guest" without a name. */
export function greet(name?: string | null): string {
  const trimmed = name?.trim() ?? "";
  return `Hello, ${trimmed === "" ? "Guest" : trimmed}!`;
}
