import type { UsageCategory } from "@/contracts";

/**
 * A category's total movement in the window, in microcredits. A category moves on one side only —
 * tools debit, adjustments credit — and the reference's overview lists both kinds in one amount
 * column, so the sum is the displayed value rather than a mixed total.
 */
export function categoryTotal(category: UsageCategory): string {
  return (BigInt(category.debited) + BigInt(category.credited)).toString();
}

/** Which side a category moves, for the Debited/Credited chip on its record list. */
export function categorySide(category: UsageCategory): "Debited" | "Credited" {
  return BigInt(category.credited) > 0n ? "Credited" : "Debited";
}
