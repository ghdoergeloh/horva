#!/bin/bash
#
# Attach to (or create) the long-lived agent tmux session.
#
# Why this exists: VS Code runs integrated terminals as children of its
# container-side server and terminates them when the client disconnects. A tmux
# session is owned by no client, so anything started inside it keeps running in the
# container after you close VS Code — and is still there when you come back.
#
# Usage, from a VS Code terminal in the container:
#
#     agent            # attach to the session, creating it if needed
#     agent -n build   # same, for a separate session named "build"
#
# Then start claude (or any long job) INSIDE it. Detach with Ctrl-b d, or just close
# VS Code — both leave it running. Reattach by running `agent` again.
#
# `agent` is on PATH via the Dockerfile symlink.

set -euo pipefail
IFS=$'\n\t'

SESSION=agent

while [ $# -gt 0 ]; do
    case "$1" in
        -n|--name)
            [ $# -ge 2 ] || { echo "error: $1 needs a session name" >&2; exit 2; }
            SESSION=$2
            shift 2
            ;;
        -l|--list)
            tmux list-sessions 2>/dev/null || echo "no tmux sessions running"
            exit 0
            ;;
        -h|--help)
            sed -n '3,20p' "$0" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        *)
            echo "error: unknown argument '$1' (try --help)" >&2
            exit 2
            ;;
    esac
done

# Already inside tmux: nesting a session inside itself is almost never intended.
if [ -n "${TMUX:-}" ]; then
    echo "Already inside a tmux session — use Ctrl-b d to detach first." >&2
    exit 1
fi

if tmux has-session -t "$SESSION" 2>/dev/null; then
    echo "Reattaching to existing session '$SESSION'."
else
    echo "Creating session '$SESSION' in /workspace."
    # -d so creation and attach are separate steps: the session exists even if the
    # attach below fails (no TTY, for instance), instead of being lost.
    tmux new-session -d -s "$SESSION" -c /workspace
fi

exec tmux attach-session -t "$SESSION"
