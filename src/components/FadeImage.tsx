"use client";

import { useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * An image that fades in once it has decoded, rather than appearing at whatever moment the browser
 * finishes with it.
 *
 * Generated media is the most-watched thing on screen and the flash from nothing to full is the
 * most noticeable abruptness in the product. One component rather than the same two lines at eight
 * call sites, so a ninth image cannot forget.
 *
 * `onError` reveals too: an image that failed should show its broken state, not stay invisible and
 * read as still loading.
 */
export function FadeImage({ className, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [shown, setShown] = useState(false);

  return (
    <img
      {...props}
      alt={props.alt ?? ""}
      onLoad={() => setShown(true)}
      onError={() => setShown(true)}
      className={cn(
        "transition-opacity duration-200 ease-out",
        shown ? "opacity-100" : "opacity-0",
        className,
      )}
    />
  );
}
