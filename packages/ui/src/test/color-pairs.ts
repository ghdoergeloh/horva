/**
 * Token pairs that the components and apps put on top of each other. Text
 * pairs need at least 4.5:1 (WCAG AA), graphic pairs such as the focus ring
 * at least 3:1. A new combination of tokens in code needs a pair here.
 */
export interface ColorPair {
  fg: string;
  bg: string;
  kind: "text" | "graphic";
}

const text = (fg: string, bg: string): ColorPair => ({ fg, bg, kind: "text" });
const graphic = (fg: string, bg: string): ColorPair => ({
  fg,
  bg,
  kind: "graphic",
});

/**
 * Project colors that have no pair, with the reason. A deleted task's
 * slot is meant to fade into the track.
 */
export const unpairedProjectColors = ["project-deleted"];

const projects = [
  "project-none",
  ...Array.from({ length: 18 }, (_, i) => `project-${i + 1}`),
];

export const colorPairs: ColorPair[] = [
  // Surfaces and their text.
  text("foreground", "background"),
  text("foreground", "card"),
  text("card-foreground", "card"),
  text("popover-foreground", "popover"),
  text("primary-foreground", "primary"),
  text("primary-foreground", "primary-hover"),
  text("secondary-foreground", "secondary"),
  text("accent-foreground", "accent"),
  text("destructive-foreground", "destructive"),
  text("warning-foreground", "warning"),
  text("success-foreground", "success"),
  text("info-foreground", "info"),
  text("running-foreground", "running"),
  text("sidebar-foreground", "sidebar"),
  text("sidebar-accent-foreground", "sidebar-accent"),
  text("sidebar-primary-foreground", "sidebar-primary"),
  // Labels, descriptions and values.
  text("muted-foreground", "background"),
  text("muted-foreground", "card"),
  text("muted-foreground", "muted"),
  text("muted-foreground", "popover"),
  // Links and states as text on the page.
  text("primary", "background"),
  text("primary", "card"),
  text("primary", "popover"),
  text("destructive", "background"),
  text("destructive", "card"),
  text("success", "background"),
  text("success", "card"),
  // The running time as text.
  text("running-text", "card"),
  text("running-text", "background"),
  text("running-text", "running-soft"),
  text("foreground", "running-soft"),
  // Fields, hover and selection inside lists and menus.
  text("foreground", "input"),
  text("muted-foreground", "input"),
  text("foreground", "accent"),
  text("muted-foreground", "accent"),
  text("foreground", "secondary"),
  text("destructive", "popover"),
  graphic("primary", "accent"),
  // Focus ring, selected borders and field borders.
  graphic("ring", "background"),
  graphic("ring", "card"),
  graphic("ring", "popover"),
  graphic("ring", "muted"),
  graphic("primary", "background"),
  graphic("input-border", "input"),
  graphic("input-border", "card"),
  // The running mark and the project colors as dots and blocks.
  graphic("running", "card"),
  graphic("running", "background"),
  ...projects.map((project) => graphic(project, "card")),
  // The check mark on a selected swatch of the color picker.
  ...projects.slice(1).map((project) => graphic("card", project)),
];
