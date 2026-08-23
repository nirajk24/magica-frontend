const MICRO_PER_CREDIT = 1_000_000n;
const MICRO_DIGITS = 6;

/** Turn totals and tool costs render to two significant digits; balances and estimates use four. */
export const CREDIT_DIGITS = { amount: 2, balance: 4 } as const;

function roundToSignificant(magnitude: bigint, significantDigits: number): bigint {
  const digits = magnitude.toString().length;
  if (digits <= significantDigits) return magnitude;

  const factor = 10n ** BigInt(digits - significantDigits);

  return ((magnitude + factor / 2n) / factor) * factor;
}

function decimalsFor(magnitude: bigint, significantDigits: number): number {
  if (magnitude === 0n) return 2;

  const leadingExponent = magnitude.toString().length - 1 - MICRO_DIGITS;

  return Math.max(0, significantDigits - 1 - leadingExponent);
}

/**
 * Renders a microcredit amount the way the reference does: credits in millions with an `M` suffix,
 * to a fixed number of *significant* digits rather than fixed decimals — `0.010M`, `0.42M`, `29.96M`.
 *
 * Fixed decimals would collapse every cheap tool call to the same `0.01M`, which is the difference
 * between showing a cost and showing a rounding artefact.
 *
 * INVARIANT: the input stays a string and the arithmetic is BigInt. A credit balance exceeds what a
 * double holds exactly, so `Number()` anywhere on this path silently loses precision. Rounding
 * happens before the decimal count is chosen, so a value that carries into a new power of ten does
 * not gain a spurious trailing digit.
 */
export function formatCredits(
  microcredits: string,
  significantDigits: number = CREDIT_DIGITS.amount,
): string {
  const raw = BigInt(microcredits);
  const negative = raw < 0n;

  const rounded = roundToSignificant(negative ? -raw : raw, significantDigits);
  const decimals = decimalsFor(rounded, significantDigits);

  const scale = 10n ** BigInt(decimals);
  const scaled = (rounded * scale + MICRO_PER_CREDIT / 2n) / MICRO_PER_CREDIT;
  const whole = scaled / scale;
  const fraction = scaled % scale;

  const fractionPart = decimals > 0 ? `.${fraction.toString().padStart(decimals, "0")}` : "";

  return `${negative ? "-" : ""}${whole}${fractionPart}M`;
}

const USAGE_DETAIL_THRESHOLD = 10_000n;

/**
 * Renders a microcredit amount the way the usage dashboard does: two fixed decimals, widening to
 * four below 0.01 credits so a cheap tool call still reads as a cost — `4.94M`, `0.08M`, `0.0059M`.
 *
 * This is deliberately not `formatCredits`: the rest of the product rounds to significant digits,
 * the usage tables to fixed decimals, and the two disagree on values like `0.08M` vs `0.080M`.
 */
export function formatUsageCredits(microcredits: string): string {
  const raw = BigInt(microcredits);
  const negative = raw < 0n;
  const magnitude = negative ? -raw : raw;

  const decimals = magnitude < USAGE_DETAIL_THRESHOLD ? 4 : 2;
  const scale = 10n ** BigInt(decimals);
  const scaled = (magnitude * scale + MICRO_PER_CREDIT / 2n) / MICRO_PER_CREDIT;
  const fraction = (scaled % scale).toString().padStart(decimals, "0");

  return `${negative ? "-" : ""}${scaled / scale}.${fraction}M`;
}

/** A usage record's timestamp: `8/23/2026, 3:49:21 AM`, seconds included. */
export function formatUsageTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** The usage window as the dashboard writes it: `Aug 21, 2026 - Sep 20, 2026`. */
export function formatUsagePeriod(fromIso: string, toIso: string): string {
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return `${day(fromIso)} - ${day(toIso)}`;
}

/** Milliseconds under a second, one decimal second under a minute, `Nm Ns` above. */
export function formatDuration(ms: number): string {
  if (ms < 1_000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`;

  const seconds = Math.round(ms / 1_000);

  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

/**
 * A message's timestamp: clock time for today, `Aug 21` for an older day.
 *
 * The locale is pinned rather than taken from the browser: the product is English-only and its copy
 * is compared against captures, so a viewer in a 24-hour locale would read as a fidelity miss. The
 * year only appears outside the current one, which is an extrapolation — no capture shows a message
 * old enough to prove it.
 */
export function formatMessageTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

/** Token counts, grouped the way the reference groups every other number. */
export function formatTokens(count: number): string {
  return count.toLocaleString("en-US");
}

const RELATIVE_UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

/**
 * How the task list dates a row: `3 minutes ago`, `1 hour ago`, `4 hours ago`.
 *
 * Anything under a minute reads `just now` rather than `0 minutes ago`, which is what a row created
 * by the send you just made would otherwise say.
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const elapsed = now.getTime() - new Date(iso).getTime();
  const formatter = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

  for (const [unit, ms] of RELATIVE_UNITS) {
    if (elapsed >= ms) return formatter.format(-Math.floor(elapsed / ms), unit);
  }

  return "just now";
}

/** `1.3 MB` / `963 KB` — one decimal above a megabyte, none below, which is what the capture shows. */
export function formatBytes(size: number): string {
  if (size >= 1_048_576) return `${(size / 1_048_576).toFixed(1)} MB`;
  if (size >= 1_024) return `${Math.round(size / 1_024)} KB`;

  return `${size} B`;
}
