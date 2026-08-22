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

/** Token counts, grouped the way the reference groups every other number. */
export function formatTokens(count: number): string {
  return count.toLocaleString("en-US");
}
