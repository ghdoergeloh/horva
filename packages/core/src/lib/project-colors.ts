/**
 * Project colors are stored as a token name of the design system
 * (`project-1` … `project-18`) or as a hex value the user picked
 * (`#rrggbb`). Token names follow the theme, so dark mode gets its own
 * shade; the app resolves them to CSS variables.
 */

/** The 18 preset colors, in the order of the color picker. */
export const PROJECT_COLOR_TOKENS = Array.from(
  { length: 18 },
  (_, i) => `project-${String(i + 1)}`,
);

/** The color of a slot without a task, and so without a project. */
export const NO_PROJECT_COLOR = "project-none";

/**
 * The first presets, checked side by side to be easy to tell apart. New
 * projects get one of these.
 */
const NEW_PROJECT_TOKENS = PROJECT_COLOR_TOKENS.slice(0, 8);

/**
 * The light values of the tokens in `tooling/tailwind/theme.css`, for
 * outputs without CSS, such as the terminal.
 */
export const PROJECT_COLOR_HEX: Record<string, string> = {
  "project-none": "#858e87",
  "project-1": "#4b5dc3",
  "project-2": "#b77c00",
  "project-3": "#008777",
  "project-4": "#97297b",
  "project-5": "#909b2f",
  "project-6": "#006398",
  "project-7": "#d85164",
  "project-8": "#8459c3",
  "project-9": "#0099ae",
  "project-10": "#ba2c25",
  "project-11": "#6d9d2d",
  "project-12": "#783288",
  "project-13": "#2b7ad6",
  "project-14": "#c86890",
  "project-15": "#2e5297",
  "project-16": "#80512f",
  "project-17": "#5c6b7a",
  "project-18": "#8a7f6c",
};

/** A valid stored project color: a token name or `#rrggbb`. */
export const PROJECT_COLOR_PATTERN =
  /^(?:project-(?:[1-9]|1[0-8]|none)|#[0-9a-fA-F]{6})$/;

/** The hex value of a stored color, e.g. for the terminal. */
export function projectColorHex(color: string): string {
  return PROJECT_COLOR_HEX[color] ?? color;
}

/**
 * The color for a new project: the token of `project-1` … `project-8` that
 * the given projects use least, and of those the one with the lowest number.
 */
export function nextProjectColor(usedColors: readonly string[]): string {
  const uses = new Map(NEW_PROJECT_TOKENS.map((token) => [token, 0]));
  for (const color of usedColors) {
    const count = uses.get(color);
    if (count !== undefined) uses.set(color, count + 1);
  }
  let best = NEW_PROJECT_TOKENS[0] ?? "project-1";
  for (const token of NEW_PROJECT_TOKENS) {
    if ((uses.get(token) ?? 0) < (uses.get(best) ?? 0)) best = token;
  }
  return best;
}
