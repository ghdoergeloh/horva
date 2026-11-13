// Copies the running Node.js binary to src-tauri/binaries, where Tauri
// expects the sidecar `binaries/node` (tauri.conf.json, externalBin) under
// the name of the target triple: node-aarch64-apple-darwin, …
// The bundle ships this binary, so it must be the Node.js of .nvmrc.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const triple =
  process.env["TAURI_ENV_TARGET_TRIPLE"] ??
  /host: (\S+)/.exec(execFileSync("rustc", ["-vV"], { encoding: "utf8" }))?.[1];
if (!triple) throw new Error("Cannot find the target triple in `rustc -vV`");

const extension = process.platform === "win32" ? ".exe" : "";
const dir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../src-tauri/binaries",
);
mkdirSync(dir, { recursive: true });
const target = join(dir, `node-${triple}${extension}`);
copyFileSync(process.execPath, target);
console.log(`sidecar: ${process.execPath} -> ${target}`);
