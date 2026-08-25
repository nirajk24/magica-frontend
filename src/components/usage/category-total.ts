import type { UsageCategory } from "@/contracts";
import type { UsageSide } from "@/components/usage/UsagePage";

/**
 * The amount a category moved on the side currently being shown.
 *
 * A category can move on both — a tool debits when it runs and credits back when it is refunded —
 * so the sum of the two is not what either view is asking for. Showing it put a debited figure
 * under a "Total Credited" heading, in a table that also listed every category regardless of side.
 */
export function categoryAmount(category: UsageCategory, show: UsageSide): string {
  return show === "credited" ? category.credited : category.debited;
}

/** The categories that moved on the side being shown; the others belong to the other view. */
export function categoriesOn(
  categories: readonly UsageCategory[],
  show: UsageSide,
): UsageCategory[] {
  return categories.filter((category) => BigInt(categoryAmount(category, show)) > 0n);
}

/** Which side a category moves, for the Debited/Credited chip on its record list. */
export function categorySide(category: UsageCategory): "Debited" | "Credited" {
  return BigInt(category.credited) > 0n ? "Credited" : "Debited";
}
