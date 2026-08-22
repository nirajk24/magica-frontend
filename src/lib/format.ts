const MICRO_PER_CREDIT = 1_000_000n;

/**
 * Renders a microcredit amount the way the reference does: credits in millions with an `M` suffix.
 *
 * INVARIANT: the input stays a string and the arithmetic is BigInt. A credit balance exceeds what a
 * double can hold exactly, so `Number()` anywhere on this path silently loses precision.
 */
export function formatCredits(microcredits: string, decimals = 2): string {
  const raw = BigInt(microcredits);
  const negative = raw < 0n;
  const magnitude = negative ? -raw : raw;

  const scale = 10n ** BigInt(decimals);
  const scaled = (magnitude * scale + MICRO_PER_CREDIT / 2n) / MICRO_PER_CREDIT;
  const whole = scaled / scale;
  const fraction = scaled % scale;

  const fractionPart = decimals > 0 ? `.${fraction.toString().padStart(decimals, "0")}` : "";

  return `${negative ? "-" : ""}${whole}${fractionPart}M`;
}

/** Milliseconds under a second, one decimal second under a minute, `Nm Ns` above. */
export function formatDuration(ms: number): string {
  if (ms < 1_000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`;

  const seconds = Math.round(ms / 1_000);

  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

/**
 * Clock time in the reference's format.
 *
 * The locale is pinned rather than taken from the browser: the product is English-only and its copy
 * is compared against captures, so a viewer in a 24-hour locale would read as a fidelity miss.
 */
export function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
