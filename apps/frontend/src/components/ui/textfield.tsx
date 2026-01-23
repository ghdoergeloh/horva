"use client";

import type { ComponentProps } from "react";
import {
  Input as AriaInput,
  TextArea as AriaTextArea,
  TextField as AriaTextField,
  composeRenderProps,
  Text,
} from "react-aria-components";
import type { ValidationResult } from "react-aria-components";

import { cn } from "@/lib/utils";

import { FieldError, Label } from "./field";

const TextField = AriaTextField;

type InputProps = ComponentProps<typeof AriaInput>;

const Input = ({ className, ...props }: InputProps) => {
  return (
    <AriaInput
      className={composeRenderProps(className, (className) =>
        cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground",
          /* Disabled */
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          /* Focused */
          "data-[focused]:outline-none data-[focused]:ring-2 data-[focused]:ring-ring data-[focused]:ring-offset-2",
          /* Resets */
          "focus-visible:outline-none",
          className
        )
      )}
      {...props}
    />
  );
};

type TextAreaProps = ComponentProps<typeof AriaTextArea>;

const TextArea = ({ className, ...props }: TextAreaProps) => {
  return (
    <AriaTextArea
      className={composeRenderProps(className, (className) =>
        cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground",
          /* Focused */
          "data-[focused]:outline-none data-[focused]:ring-2 data-[focused]:ring-ring data-[focused]:ring-offset-2",
          /* Disabled */
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          /* Resets */
          "focus-visible:outline-none",
          className
        )
      )}
      {...props}
    />
  );
};

type TextFieldProps = ComponentProps<typeof AriaTextField>;

type JollyTextFieldProps = TextFieldProps & {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  textArea?: boolean;
};

function JollyTextField({
  label,
  description,
  errorMessage,
  textArea,
  className,
  ...props
}: JollyTextFieldProps) {
  return (
    <TextField
      className={composeRenderProps(className, (className) =>
        cn("group flex flex-col gap-2", className)
      )}
      {...props}
    >
      <Label>{label}</Label>
      {textArea ? <TextArea /> : <Input />}
      {description && (
        <Text className="text-sm text-muted-foreground" slot="description">
          {description}
        </Text>
      )}
      <FieldError>{errorMessage}</FieldError>
    </TextField>
  );
}

export { Input, TextField, JollyTextField, TextArea };
export type { JollyTextFieldProps };
