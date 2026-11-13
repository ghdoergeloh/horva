# 0004: Tauri shell with a Node.js sidecar

Status: proposed (2026-11-13), replaces `0002` if accepted

## Context

The desktop app was an Electron app. Tauri is the main alternative: a
small Rust shell that shows the app in the webview of the system
(WebKit on macOS and Linux, WebView2 on Windows) instead of shipping
Chromium. Its backend runs in Rust, not in Node.js. All business logic of
Horva is TypeScript in `packages/core` and needs Node.js (`pg`, Drizzle).

## Decision

`apps/tauri` replaces `apps/electron`. The Rust shell starts a Node.js
sidecar (`src/backend`) that serves the oRPC contract on stdin and stdout.
The webview sends lines to the shell with `invoke("backend_send")` and
gets the lines of the sidecar through a Tauri `Channel`. The shell does
not read the lines (protocol: `src/shared/protocol.ts`).

## Reason

- Rewriting `packages/core` in Rust would mean two implementations of the
  business logic. The sidecar keeps one.
- stdin and stdout need no port and no token, like the MessagePort of
  `0002`. A local HTTP server on 127.0.0.1 would need both, and its
  origin rules differ between WebKit and WebView2.
- The first-launch setup becomes a small oRPC contract
  (`src/shared/setup-contract.ts`) with Zod input, instead of untyped IPC
  channels.

## Consequences

- The bundle carries a Node.js binary (about 100 to 150 MB unpacked, by
  platform). The Rust shell itself is about 6 MB. Electron's runtime is
  about 290 MB unpacked. The real size win of Tauri needs a backend
  without Node.js.
- The app renders in three different engines. Layout and CSS bugs can
  differ between macOS, Linux and Windows; Electron had one Chromium.
- Building needs Rust and, on Linux, WebKitGTK. CI runs `cargo fmt`,
  Clippy and `cargo test` for the shell.
- Playwright cannot drive the system webviews on all platforms. The
  end-to-end test runs the built webview in Chromium with the real
  sidecar; a stub replaces the shell.
- Tauri checks every command against a capability
  (`src-tauri/capabilities/default.json`). The window may call the two
  backend commands and open https links, nothing more.
