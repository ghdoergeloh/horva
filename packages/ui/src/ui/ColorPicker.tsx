"use client";

import type React from "react";
import type { ColorPickerProps as AriaColorPickerProps } from "react-aria-components";
import {
  ColorPicker as AriaColorPicker,
  Button,
  DialogTrigger,
} from "react-aria-components";
import { tv } from "tailwind-variants";

import { focusRing } from "@timetracker/ui";

import { ColorArea } from "./ColorArea";
import { ColorField } from "./ColorField";
import { ColorSlider } from "./ColorSlider";
import { ColorSwatch } from "./ColorSwatch";
import { Dialog } from "./Dialog";
import { Popover } from "./Popover";

const buttonStyles = tv({
  extend: focusRing,
  base: "border-0 bg-transparent flex gap-2 items-center cursor-default rounded-xs font-sans text-sm text-neutral-800 dark:text-neutral-200 [-webkit-tap-highlight-color:transparent]",
});

export interface ColorPickerProps extends Omit<
  AriaColorPickerProps,
  "children"
> {
  label?: string;
  children?: React.ReactNode;
}

export function ColorPicker({ label, children, ...props }: ColorPickerProps) {
  return (
    <AriaColorPicker {...props}>
      <DialogTrigger>
        <Button className={buttonStyles}>
          <ColorSwatch />
          <span>{label}</span>
        </Button>
        <Popover placement="bottom start">
          <Dialog className="flex flex-col gap-2">
            {children ?? (
              <>
                <ColorArea
                  colorSpace="hsb"
                  xChannel="saturation"
                  yChannel="brightness"
                />
                <ColorSlider colorSpace="hsb" channel="hue" />
                <ColorField label="Hex" />
              </>
            )}
          </Dialog>
        </Popover>
      </DialogTrigger>
    </AriaColorPicker>
  );
}
