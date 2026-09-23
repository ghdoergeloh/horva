"use client";

import type {
  TableProps as AriaTableProps,
  CellProps,
  ColumnProps,
  RowProps,
  TableBodyProps,
  TableHeaderProps,
} from "react-aria-components";
import { ArrowUp } from "lucide-react";
import {
  Cell as AriaCell,
  Column as AriaColumn,
  Row as AriaRow,
  Table as AriaTable,
  TableBody as AriaTableBody,
  TableHeader as AriaTableHeader,
  Button,
  Collection,
  ColumnResizer,
  composeRenderProps,
  Group,
  ResizableTableContainer,
  useTableOptions,
} from "react-aria-components";
import { twMerge } from "tailwind-merge";
import { tv } from "tailwind-variants";

import { composeTailwindRenderProps, focusRing } from "@repo/ui";

import { Checkbox } from "./Checkbox";

interface TableProps extends Omit<AriaTableProps, "className"> {
  className?: string;
}

export function Table(props: TableProps) {
  return (
    <ResizableTableContainer
      onScroll={props.onScroll}
      className={twMerge(
        "border-border bg-background relative box-border max-h-[320px] w-full scroll-pt-[2.281rem] overflow-auto rounded-lg border font-sans",
        props.className,
      )}
    >
      <AriaTable
        {...props}
        className="box-border border-separate border-spacing-0 overflow-hidden has-[>[data-empty]]:h-full"
      />
    </ResizableTableContainer>
  );
}

const columnStyles = tv({
  extend: focusRing,
  base: "px-2 h-5 box-border flex-1 flex gap-1 items-center overflow-hidden",
});

const resizerStyles = tv({
  extend: focusRing,
  base: "w-px px-[8px] translate-x-[8px] box-content py-1 h-5 bg-clip-content bg-border forced-colors:bg-[ButtonBorder] cursor-col-resize rounded-xs resizing:bg-primary forced-colors:resizing:bg-[Highlight] resizing:w-[2px] resizing:pl-[7px] -outline-offset-2",
});

export function Column(props: ColumnProps) {
  return (
    <AriaColumn
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "text-foreground box-border h-1 cursor-default text-start text-sm font-semibold focus-within:z-20 [&:hover]:z-20",
      )}
    >
      {composeRenderProps(
        props.children,
        (children, { allowsSorting, sortDirection }) => (
          <div className="flex items-center">
            <Group role="presentation" tabIndex={-1} className={columnStyles}>
              <span className="truncate">{children}</span>
              {allowsSorting && (
                <span
                  className={`flex h-4 w-4 items-center justify-center transition ${
                    sortDirection === "descending" ? "rotate-180" : ""
                  }`}
                >
                  {sortDirection && (
                    <ArrowUp
                      aria-hidden
                      className="text-muted-foreground h-4 w-4 forced-colors:text-[ButtonText]"
                    />
                  )}
                </span>
              )}
            </Group>
            {!props.width && <ColumnResizer className={resizerStyles} />}
          </div>
        ),
      )}
    </AriaColumn>
  );
}

export function TableHeader<T extends object>(props: TableHeaderProps<T>) {
  const { selectionBehavior, selectionMode, allowsDragging } =
    useTableOptions();

  return (
    <AriaTableHeader
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "border-b-border bg-muted/60 supports-[-moz-appearance:none]:bg-muted sticky top-0 z-10 rounded-t-lg border-b backdrop-blur-md forced-colors:bg-[Canvas]",
      )}
    >
      {/* Add extra columns for drag and drop and selection. */}
      {allowsDragging && <Column />}
      {selectionBehavior === "toggle" && (
        <AriaColumn
          width={36}
          minWidth={36}
          className="box-border cursor-default p-2 text-start text-sm font-semibold"
        >
          {selectionMode === "multiple" && <Checkbox slot="selection" />}
        </AriaColumn>
      )}
      <Collection items={props.columns}>{props.children}</Collection>
    </AriaTableHeader>
  );
}

export function TableBody<T extends object>(props: TableBodyProps<T>) {
  return (
    <AriaTableBody
      {...props}
      className="empty:text-center empty:text-sm empty:italic"
    />
  );
}

const rowStyles = tv({
  extend: focusRing,
  base: "group/row relative cursor-default select-none -outline-offset-2 text-foreground disabled:text-muted-foreground/50 text-sm hover:bg-accent pressed:bg-accent selected:bg-primary/10 selected:hover:bg-primary/20 selected:pressed:bg-primary/20 last:rounded-b-lg",
});

export function Row<T extends object>({
  id,
  columns,
  children,
  ...otherProps
}: RowProps<T>) {
  const { selectionBehavior, allowsDragging } = useTableOptions();

  return (
    <AriaRow id={id} {...otherProps} className={rowStyles}>
      {allowsDragging && (
        <Cell>
          <Button slot="drag">≡</Button>
        </Cell>
      )}
      {selectionBehavior === "toggle" && (
        <Cell>
          <Checkbox slot="selection" />
        </Cell>
      )}
      <Collection items={columns}>{children}</Collection>
    </AriaRow>
  );
}

const cellStyles = tv({
  extend: focusRing,
  base: "box-border [-webkit-tap-highlight-color:transparent] border-b border-b-border group-last/row:border-b-0 [--selected-border:var(--color-primary)] group-selected/row:border-(--selected-border) [:is(:has(+[data-selected])_*)]:border-(--selected-border) p-2 truncate -outline-offset-2 group-last/row:first:rounded-bl-lg group-last/row:last:rounded-br-lg",
});

export function Cell(props: CellProps) {
  return <AriaCell {...props} className={cellStyles} />;
}
