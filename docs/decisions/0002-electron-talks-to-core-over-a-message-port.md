# 0002: Electron talks to core over a MessagePort

Status: accepted (2026-09-30)

## Context

The desktop app shows the same React app as the browser. It could call a
local API over HTTP, or the Electron main process directly.

## Decision

The renderer sends a `MessagePort` to the main process, which serves the
oRPC contract on it (`apps/electron/src/main/orpc`). The React app gets its
link through `setOrpcLink()`: HTTP in the browser, the port in Electron.

## Reason

The desktop app needs no HTTP server, no port and no login: the main
process builds the context once per connection from the local user that
the setup wizard created.

## Consequences

The one-origin setup of `0001` applies to the browser only. Handlers must
not depend on HTTP details such as headers.
