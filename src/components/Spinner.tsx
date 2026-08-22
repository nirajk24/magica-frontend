import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * The inline spinner, for a control or a row that is working — a pending send, a running tool.
 * The reference draws these as a single rotating arc.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin text-fg-subtle", className)}
    />
  );
}

/**
 * The app-level loader: a ring of fine tapered spokes at fixed, graduated opacity, rotating as one.
 *
 * Deliberately not the same shape as `Spinner`. The reference uses a rotating arc inline and this
 * radial indicator for whole-screen waits, and the two read very differently — the arc is a control
 * that is busy, this is the app itself still arriving.
 *
 * The ring **rotates**; the spokes do not each pulse. The opacity gradient is baked in and spins with
 * it, which is what gives a steady chase rather than a colour flicker.
 *
 * A periodicity analysis of the reference capture reads eight spokes, but that capture is a ~17px
 * lossy thumbnail and the live product reads finer than that; twelve is the observed count.
 */
const SPOKES = 10;
const DIMMEST = 0.14;

export function RadialSpinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      data-spinner
      className={cn("relative inline-block size-5 animate-spin text-fg-subtle", className)}
      style={{ animationDuration: "1s" }}
    >
      {Array.from({ length: SPOKES }, (_, index) => (
        <span
          key={index}
          className="absolute top-1/2 left-1/2 h-[26%] w-[7%] rounded-full bg-current"
          style={{
            transform: `translate(-50%, -50%) rotate(${(360 / SPOKES) * index}deg) translateY(-165%)`,
            opacity: 1 - (index / SPOKES) * (1 - DIMMEST),
          }}
        />
      ))}
    </span>
  );
}
