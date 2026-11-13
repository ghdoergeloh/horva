import { describe, expect, it } from "vitest";

import { messageData, parseLine } from "./protocol";

describe("parseLine", () => {
  it.each([
    ['{"ch":"setup","data":"x"}', { ch: "setup", data: "x" }],
    ['{"ch":"rpc","data":"x"}', { ch: "rpc", data: "x" }],
    ['{"ch":"rpc","open":true}', { ch: "rpc", open: true }],
    ['{"ch":"rpc","closed":"gone"}', { ch: "rpc", closed: "gone" }],
  ])("reads %s", (line, message) => {
    expect(parseLine(line)).toEqual(message);
  });

  it.each([
    "not json",
    "null",
    '"text"',
    '{"ch":"other","data":"x"}',
    '{"ch":"setup","data":1}',
    '{"ch":"setup","open":true}',
    '{"ch":"setup","closed":"gone"}',
    '{"ch":"rpc"}',
  ])("ignores %s", (line) => {
    expect(parseLine(line)).toBeNull();
  });
});

describe("messageData", () => {
  it("passes strings on", () => {
    expect(messageData("x")).toBe("x");
  });

  it("refuses binary messages", () => {
    expect(() => messageData(new Uint8Array([1]))).toThrow(/string/);
  });
});
