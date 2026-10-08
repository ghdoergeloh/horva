"use client";

import type React from "react";
import { useId, useRef, useState } from "react";
import { Check } from "lucide-react";

import type { ProjectColor } from "./Chip";
import { twMerge } from "../lib/tw";
import { ProjectDot, projectColorValue } from "./Chip";

/** The 18 preset project colors, as stored: `project-1` … `project-18`. */
export const PROJECT_COLOR_PRESETS = Array.from(
  { length: 18 },
  (_, i) => `project-${i + 1}`,
);

/** The German names of the presets, in the order of the presets. */
export const PROJECT_COLOR_NAMES = [
  "Indigo",
  "Bernstein",
  "Petrol",
  "Magenta",
  "Oliv",
  "Himmelblau",
  "Rosé",
  "Violett",
  "Cyan",
  "Rot",
  "Limette",
  "Purpur",
  "Blau",
  "Pink",
  "Marine",
  "Braun",
  "Schiefer",
  "Stein",
];

/** Swatches per row; the arrow keys up and down move by one row. */
const COLUMNS = 6;

/**
 * A hex color as `#RRGGBB` in upper case, from input with or without `#`
 * and in short form (`abc`). `null` when the input is no hex color.
 */
export function normalizeHex(input: string): string | null {
  let digits = input.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(digits)) {
    digits = [...digits].map((d) => d + d).join("");
  }
  return /^[0-9a-f]{6}$/i.test(digits) ? `#${digits.toUpperCase()}` : null;
}

/** All texts of the color picker. Each one has a German default. */
export interface ProjectColorPickerLabels {
  /** The names of the 18 presets, in order, for screen readers and tooltips. */
  presets: readonly string[];
  custom: string;
  customPlaceholder: string;
  invalid: string;
}

const defaultLabels: ProjectColorPickerLabels = {
  presets: PROJECT_COLOR_NAMES,
  custom: "Eigene Farbe",
  customPlaceholder: "#RRGGBB",
  invalid: "Bitte einen Hex-Wert mit sechs Stellen eingeben.",
};

export interface ProjectColorPickerProps {
  /** The stored color: a preset token name or a hex value. */
  value: ProjectColor | null;
  /** Called with the preset token name or the custom hex value. */
  onChange: (value: ProjectColor) => void;
  /** @default 'Projektfarbe' */
  label?: string;
  isDisabled?: boolean;
  labels?: Partial<ProjectColorPickerLabels>;
  className?: string;
}

/**
 * The color choice for a project: 18 presets as a radio group in a grid
 * (arrow keys move in the grid), plus a field for a custom hex color.
 * Made for a popover surface: the gap around the selection ring is the
 * popover color.
 */
export function ProjectColorPicker({
  value,
  onChange,
  label = "Projektfarbe",
  isDisabled = false,
  labels: labelOverrides,
  className,
}: ProjectColorPickerProps) {
  const labels = { ...defaultLabels, ...labelOverrides };
  const id = useId();
  const swatches = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = value ? PROJECT_COLOR_PRESETS.indexOf(value) : -1;
  const customValue = value && selected < 0 ? normalizeHex(value) : null;
  // The text while the user edits the field; `null` shows the stored value.
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);

  function choose(index: number) {
    swatches.current[index]?.focus();
    setInvalid(false);
    setDraft(null);
    const token = PROJECT_COLOR_PRESETS[index];
    if (token && token !== value) onChange(token);
  }

  function onGridKeyDown(e: React.KeyboardEvent) {
    const current = swatches.current.findIndex(
      (swatch) => swatch === document.activeElement,
    );
    if (current < 0) return;
    const last = PROJECT_COLOR_PRESETS.length - 1;
    const moves: Record<string, number> = {
      ArrowRight: current === last ? 0 : current + 1,
      ArrowLeft: current === 0 ? last : current - 1,
      ArrowDown: current + COLUMNS <= last ? current + COLUMNS : current,
      ArrowUp: current - COLUMNS >= 0 ? current - COLUMNS : current,
      Home: 0,
      End: last,
    };
    const next = moves[e.key];
    if (next === undefined) return;
    e.preventDefault();
    choose(next);
  }

  function commit() {
    if (draft === null) return;
    if (draft.trim() === "") {
      setDraft(null);
      setInvalid(false);
      return;
    }
    const hex = normalizeHex(draft);
    if (!hex) {
      setInvalid(true);
      return;
    }
    setDraft(null);
    setInvalid(false);
    if (hex !== value) onChange(hex);
  }

  return (
    <div
      data-disabled={isDisabled || undefined}
      className={twMerge("flex w-max flex-col gap-2 font-sans", className)}
    >
      <span
        id={`${id}-label`}
        className="text-popover-foreground text-small font-medium"
      >
        {label}
      </span>
      {/* The radios carry the focus, with one tab stop for the group. */}
      {/* oxlint-disable-next-line jsx-a11y/interactive-supports-focus */}
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        aria-disabled={isDisabled || undefined}
        className="grid grid-cols-[repeat(6,1.75rem)] gap-2 p-1"
        onKeyDown={onGridKeyDown}
      >
        {PROJECT_COLOR_PRESETS.map((token, index) => {
          const isSelected = index === selected;
          const name = labels.presets[index] ?? token;
          return (
            <button
              key={token}
              ref={(element) => {
                swatches.current[index] = element;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={name}
              title={name}
              disabled={isDisabled}
              // One tab stop for the group: the chosen swatch or the first.
              tabIndex={index === Math.max(selected, 0) ? 0 : -1}
              onClick={() => choose(index)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                // Enter takes the swatch and does nothing else, such as
                // submitting the form around the picker.
                e.preventDefault();
                e.stopPropagation();
                choose(index);
              }}
              className={twMerge(
                "outline-ring grid size-7 cursor-default place-items-center rounded-full outline-offset-3 focus-visible:outline-2 disabled:opacity-45 forced-colors:outline-[Highlight]",
                isSelected &&
                  "ring-foreground ring-offset-popover ring-2 ring-offset-2",
              )}
              style={{ background: projectColorValue(token) }}
            >
              {isSelected && (
                <Check
                  aria-hidden
                  strokeWidth={3}
                  className="text-card size-3.5"
                />
              )}
            </button>
          );
        })}
      </div>
      <div className="border-border flex items-center justify-between gap-3 border-t pt-2">
        <label
          htmlFor={`${id}-custom`}
          className="text-muted-foreground text-caption"
        >
          {labels.custom}
        </label>
        <div
          className={twMerge(
            "border-input-border bg-input has-focus-visible:outline-ring flex h-7.5 w-33 items-center gap-2 rounded-md border px-2.5 has-focus-visible:outline-2 has-focus-visible:outline-offset-1",
            invalid && "border-destructive",
            isDisabled && "opacity-45",
          )}
        >
          <ProjectDot color={customValue ?? "project-none"} />
          <input
            id={`${id}-custom`}
            value={draft ?? customValue ?? ""}
            placeholder={labels.customPlaceholder}
            disabled={isDisabled}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? `${id}-error` : undefined}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              // Enter takes the color and does nothing else, such as
              // submitting the form around the picker.
              e.preventDefault();
              e.stopPropagation();
              commit();
            }}
            className="text-foreground placeholder:text-muted-foreground text-small min-w-0 flex-1 bg-transparent font-mono uppercase outline-0 placeholder:normal-case"
          />
        </div>
      </div>
      {invalid && (
        <p id={`${id}-error`} className="text-destructive text-caption">
          {labels.invalid}
        </p>
      )}
    </div>
  );
}
