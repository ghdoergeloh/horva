/**
 * The messages between the webview and the backend sidecar. The sidecar
 * reads one JSON object per line on stdin and writes one per line on
 * stdout. The Rust shell (src-tauri/src/lib.rs) passes the lines on as they
 * are and does not read them.
 *
 * There are two channels. `setup` is open from the start. `rpc` serves
 * `@horva/contract` and opens only when the webview sends `open`, after the
 * setup wizard: its context needs the local user of the setup.
 */
export type Channel = "setup" | "rpc";

/** A line from the webview to the sidecar. */
export type InboundLine =
  | { ch: Channel; data: string }
  | { ch: "rpc"; open: true };

/** A line from the sidecar to the webview. */
export type OutboundLine =
  | { ch: Channel; data: string }
  | { ch: "rpc"; closed: string };

/** Parses one line, or returns null if it is not a message of this protocol. */
export function parseLine(line: string): InboundLine | OutboundLine | null {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const message = value as Record<string, unknown>;
  if (message["ch"] !== "setup" && message["ch"] !== "rpc") return null;
  if (typeof message["data"] === "string") return message as InboundLine;
  if (message["ch"] === "rpc" && message["open"] === true)
    return message as InboundLine;
  if (message["ch"] === "rpc" && typeof message["closed"] === "string")
    return message as OutboundLine;
  return null;
}

/**
 * oRPC encodes a message as a string unless its body holds a Blob. The
 * contract has no file uploads, so a line always carries a string.
 */
export function messageData(data: unknown): string {
  if (typeof data !== "string")
    throw new Error("Only string messages fit on a line of the backend pipe");
  return data;
}
