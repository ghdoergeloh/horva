"use client";

import type {
  SearchFieldProps as AriaSearchFieldProps,
  ValidationResult,
} from "react-aria-components";
import { SearchIcon, XIcon } from "lucide-react";
import { SearchField as AriaSearchField } from "react-aria-components";

import { composeTailwindRenderProps } from "@timetracker/ui";

import { Description, FieldError, FieldGroup, Input, Label } from "./Field";
import { FieldButton } from "./FieldButton";

export interface SearchFieldProps extends AriaSearchFieldProps {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  placeholder?: string;
}

export function SearchField({
  label,
  description,
  errorMessage,
  placeholder,
  ...props
}: SearchFieldProps) {
  return (
    <AriaSearchField
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "group flex max-w-full min-w-[40px] flex-col gap-1 font-sans",
      )}
    >
      {label && <Label>{label}</Label>}
      <FieldGroup>
        <SearchIcon
          aria-hidden
          className="ml-2 h-4 w-4 text-neutral-500 group-disabled:text-neutral-200 dark:text-neutral-400 dark:group-disabled:text-neutral-600 forced-colors:text-[ButtonText] forced-colors:group-disabled:text-[GrayText]"
        />
        <Input
          placeholder={placeholder}
          className="pl-2 [&::-webkit-search-cancel-button]:hidden"
        />
        <FieldButton className="mr-1 w-6 group-empty:invisible">
          <XIcon aria-hidden className="h-4 w-4" />
        </FieldButton>
      </FieldGroup>
      {description && <Description>{description}</Description>}
      <FieldError>{errorMessage}</FieldError>
    </AriaSearchField>
  );
}
