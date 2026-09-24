"use client";

import type { ToastProps } from "react-aria-components";
import { XIcon } from "lucide-react";
import {
  Button,
  Text,
  UNSTABLE_Toast as Toast,
  UNSTABLE_ToastContent as ToastContent,
  UNSTABLE_ToastQueue as ToastQueue,
  UNSTABLE_ToastRegion as ToastRegion,
} from "react-aria-components";
import { flushSync } from "react-dom";

import { composeTailwindRenderProps } from "@horva/ui";

import "./Toast.css";

// Define the type for your toast content. This interface defines the properties of your toast content, affecting what you
// pass to the queue calls as arguments.
interface MyToastContent {
  title: string;
  description?: string;
}

// This is a global toast queue, to be imported and called where ever you want to queue a toast via queue.add().
export const queue = new ToastQueue<MyToastContent>({
  // Wrap state updates in a CSS view transition.
  wrapUpdate(fn) {
    if ("startViewTransition" in document) {
      document.startViewTransition(() => {
        flushSync(fn);
      });
    } else {
      fn();
    }
  },
});

export function MyToastRegion() {
  return (
    // The ToastRegion should be rendered at the root of your app.
    <ToastRegion
      queue={queue}
      className="focus-visible:outline-ring fixed right-4 bottom-4 flex flex-col-reverse gap-2 rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid"
    >
      {({ toast }) => (
        <MyToast toast={toast}>
          <ToastContent className="flex min-w-0 flex-1 flex-col">
            <Text
              slot="title"
              className="text-primary-foreground text-sm font-semibold"
            >
              {toast.content.title}
            </Text>
            {toast.content.description && (
              <Text
                slot="description"
                className="text-primary-foreground text-xs"
              >
                {toast.content.description}
              </Text>
            )}
          </ToastContent>
          <Button
            slot="close"
            aria-label="Close"
            className="pressed:bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/10 focus-visible:outline-primary-foreground flex h-8 w-8 flex-none appearance-none items-center justify-center rounded-sm border-none bg-transparent p-0 outline-none [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </MyToast>
      )}
    </ToastRegion>
  );
}

export function MyToast(props: ToastProps<MyToastContent>) {
  return (
    <Toast
      {...props}
      style={{ viewTransitionName: props.toast.key }}
      className={composeTailwindRenderProps(
        props.className,
        "bg-primary focus-visible:outline-ring flex w-[230px] items-center gap-4 rounded-lg px-4 py-3 font-sans outline-none [view-transition-class:toast] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid forced-colors:outline",
      )}
    />
  );
}
