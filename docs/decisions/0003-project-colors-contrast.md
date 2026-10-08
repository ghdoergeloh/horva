# 0003: Project colors keep 3:1 on cards only

Status: accepted (2026-10-08)

## Context

The design system (`docs/design`) gives 18 project colors with a light
and a dark value. Its own rule asks for 3:1 for every mark in both
themes. The colors reach 3:1 on `card`, where slot blocks, dots and
chart segments mostly sit. On `muted`, `popover` and `background` some
of them fall to between 2.7:1 and 3:1 (for example `project-5` on
`muted` in light, `project-4` on `popover` in dark). The same is true
for the `running` dot on `running-soft` (2.9:1 in light).

## Decision

The contrast test checks project colors and the running dot against
`card` only. On other surfaces, a project color or the running dot is
never the only carrier of meaning: the project name or the word
"läuft" always stands next to it.

## Reason

WCAG 1.4.11 asks for 3:1 for graphics that are needed to understand
the content. A dot next to the project name is decoration, the name
carries the meaning. Darker colors on every surface would make the 18
colors harder to tell apart, which is their main job. The values stay
as designed.

## Consequences

- Charts, timeline bars and slot blocks sit on `card`.
- A component that shows a project color without its name on another
  surface needs a pair in `packages/ui/src/test/color-pairs.ts`, and
  then it fails until the color or the surface changes.
