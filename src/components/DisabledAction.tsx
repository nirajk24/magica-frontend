"use client";

import type { ComponentType } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

type IconComponent = ComponentType<{ className?: string }>;

/**
 * A control the reference shows but this build does not implement yet, rendered with the reason.
 *
 * It carries `aria-disabled` rather than `disabled` on purpose: a natively disabled button receives
 * no pointer events, so the tooltip never opens, and screen readers skip it entirely — which is
 * exactly the audience that most needs to be told why the control does nothing.
 */
export function DisabledAction({
  icon: Icon,
  label,
  reason,
  className,
  showLabel = false,
  trailingIcon: TrailingIcon,
}: {
  /** Omitted by text-only controls, such as a tool card's `View more`. */
  icon?: IconComponent;
  label: string;
  reason: string;
  className?: string;
  /** Icon-only controls name themselves through `aria-label`; labelled ones also render the text. */
  showLabel?: boolean;
  /** A second glyph after the label, for rows the reference ends with an affordance. */
  trailingIcon?: IconComponent;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-disabled
        aria-label={label}
        onClick={(event) => event.preventDefault()}
        className={cn(
          "cursor-not-allowed",
          showLabel ? "text-fg-muted" : "text-fg-subtle/60",
          className,
        )}
      >
        {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
        {showLabel && label}
        {TrailingIcon && <TrailingIcon className="size-4 shrink-0" aria-hidden />}
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}
