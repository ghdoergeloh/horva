/**
 * The message of an error from `ipcRenderer.invoke`. Electron puts
 * "Error invoking remote method '<channel>': Error: " in front of the
 * message of the main process; the user needs only that message.
 */
export function ipcErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(
    /^Error invoking remote method '[^']*': (?:[A-Za-z]*Error: )?/,
    "",
  );
}
