import { describe, expect, it, vi } from "vitest";

import { LinePort } from "./line-port";

describe("LinePort", () => {
  it("keeps messages until a message listener is added", () => {
    const port = new LinePort(() => undefined);
    port.deliver("one");
    port.deliver("two");
    const listener = vi.fn();
    port.on("message", listener);
    port.deliver("three");
    expect(listener.mock.calls).toEqual([
      [{ data: "one" }],
      [{ data: "two" }],
      [{ data: "three" }],
    ]);
  });

  it("posts through the function it was made with", () => {
    const post = vi.fn();
    new LinePort(post).postMessage("out");
    expect(post).toHaveBeenCalledWith("out");
  });

  it("tells the close listeners once and then drops all listeners", () => {
    const port = new LinePort(() => undefined);
    const closed = vi.fn();
    const message = vi.fn();
    port.on("close", closed);
    port.on("message", message);
    port.close();
    port.close();
    port.deliver("late");
    expect(closed).toHaveBeenCalledTimes(1);
    expect(message).not.toHaveBeenCalled();
  });
});
