"use client";

import * as React from "react";
import { Dialog as DialogPrimitive, VisuallyHidden } from "radix-ui";

import { cn } from "@/lib/cn";

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

/**
 * A centred dialog on a raised surface.
 *
 * `title` is read by screen readers and drawn only if `showTitle` is set: a command palette labels
 * itself with its own search field, and Radix requires a title regardless.
 */
function DialogContent({
  className,
  overlayClassName,
  title,
  showTitle = false,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  title: string;
  showTitle?: boolean;
  /** The scrim. Pass a transparent one for an overlay meant to sit over readable content. */
  overlayClassName?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-slot="dialog-overlay"
        className={cn(
          "fixed inset-0 z-50 bg-fg/20 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:duration-200",
          overlayClassName,
        )}
      />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 w-full max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-card border border-border bg-bg shadow-xl outline-none",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-200 data-[state=open]:ease-out",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-150",
          className,
        )}
        {...props}
      >
        {showTitle ? (
          <DialogPrimitive.Title className="px-4 pt-4 text-sm font-medium text-fg">
            {title}
          </DialogPrimitive.Title>
        ) : (
          <VisuallyHidden.Root asChild>
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
          </VisuallyHidden.Root>
        )}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export { Dialog, DialogContent };
