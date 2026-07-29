#!/bin/bash
#
# Default shell for VS Code integrated terminals: drops you straight into the
# long-lived tmux session, creating it on first use.
#
# Wired up via terminal.integrated.defaultProfile.linux in devcontainer.json. Doing
# it there rather than in .bashrc is deliberate: .bashrc is also sourced by
# non-interactive shells, where auto-attaching would break lifecycle commands, git
# hooks and `docker exec ... some-script`.
#
# Each new terminal gets its OWN WINDOW inside the shared session. Attaching several
# clients to the same window instead would mirror one view across every terminal —
# every pane would show the same thing and the smallest terminal would clamp the size
# of all of them.
#
# On disconnect the session and its windows keep running (see README). Reopening a
# terminal reattaches; if the previous window's shell is still alive, its scrollback
# and any running command are right there.

set -uo pipefail

SESSION="${TMUX_SESSION:-agent}"

# Already inside tmux, or tmux unavailable: fall through to a normal shell rather
# than failing. A broken default profile would leave you with no usable terminal.
if [ -n "${TMUX:-}" ] || ! command -v tmux >/dev/null 2>&1; then
    exec "${SHELL:-/bin/bash}" -l
fi

if tmux has-session -t "$SESSION" 2>/dev/null; then
    # Reuse a window whose shell is idle (no command running) so reopened terminals
    # land back where they were instead of piling up empty windows. A window running
    # claude or a dev server is left alone.
    IDLE_WINDOW=$(tmux list-panes -s -t "$SESSION" -F '#{window_id} #{pane_current_command} #{window_panes} #{?window_active,active,idle}' 2>/dev/null \
        | awk '$3 == 1 && ($2 == "bash" || $2 == "sh" || $2 == "zsh") {print $1; exit}')

    if [ -n "${IDLE_WINDOW:-}" ]; then
        exec tmux attach-session -t "$SESSION" \; select-window -t "$IDLE_WINDOW"
    fi

    # Every window is busy — give this terminal a fresh one so it never steals the
    # view from a running agent session.
    exec tmux new-window -t "$SESSION" -c "${PWD:-/workspace}" \; attach-session -t "$SESSION"
fi

exec tmux new-session -s "$SESSION" -c "${PWD:-/workspace}"
