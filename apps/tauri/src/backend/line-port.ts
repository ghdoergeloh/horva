type Listener = (event?: { data: unknown }) => void;

/**
 * A message port for oRPC's message-port adapter whose other end is a
 * channel on stdin and stdout. `post` writes a message out; `deliver` hands
 * in a message that came in. Messages that come in before the oRPC handler
 * listens wait in a queue, so a request right after `open` is not lost.
 */
export class LinePort {
  private readonly listeners = new Map<string, Listener[]>();
  private queue: string[] | null = [];
  private readonly post: (data: unknown) => void;

  constructor(post: (data: unknown) => void) {
    this.post = post;
  }

  on(event: string, callback: Listener): void {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), callback]);
    if (event === "message" && this.queue) {
      const waiting = this.queue;
      this.queue = null;
      for (const data of waiting) callback({ data });
    }
  }

  postMessage(data: unknown): void {
    this.post(data);
  }

  deliver(data: string): void {
    if (this.queue) {
      this.queue.push(data);
      return;
    }
    for (const listener of this.listeners.get("message") ?? []) {
      listener({ data });
    }
  }

  close(): void {
    for (const listener of this.listeners.get("close") ?? []) listener();
    this.listeners.clear();
  }
}
